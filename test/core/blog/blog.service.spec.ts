import { BlogService } from 'src/core/blog/blog.service';

/**
 * Runs against the real markdown content under `src/http/content/blog/`,
 * which `BlogService` resolves relative to its own location.
 */
describe('BlogService', () => {
    const service = new BlogService();
    const seedSlug = 'welcome-to-the-iwmm-blog';

    describe('getPosts', () => {
        it('returns the seed post', () => {
            const posts = service.getPosts();
            expect(posts.length).toBeGreaterThan(0);
            expect(posts.some((post) => post.slug === seedSlug)).toBe(true);
        });

        it('returns summaries without rendered HTML', () => {
            const [post] = service.getPosts();
            expect(post).toMatchObject({
                slug: expect.any(String),
                title: expect.any(String),
                date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                description: expect.any(String),
            });
            expect((post as unknown as Record<string, unknown>).html).toBeUndefined();
        });

        it('sorts posts newest first', () => {
            const dates = service.getPosts().map((post) => post.date);
            const sorted = [...dates].sort((a, b) => b.localeCompare(a));
            expect(dates).toEqual(sorted);
        });
    });

    describe('getPost', () => {
        it('returns a post with rendered markdown HTML', () => {
            const post = service.getPost(seedSlug);
            expect(post).not.toBeNull();
            expect(post?.slug).toBe(seedSlug);
            expect(post?.html).toContain('<h2');
            expect(post?.html).toContain('<p>');
        });

        it('returns null for an unknown slug', () => {
            expect(service.getPost('does-not-exist')).toBeNull();
        });

        it('returns null for slugs with path-traversal characters', () => {
            expect(service.getPost('../../secret')).toBeNull();
            expect(service.getPost('foo/bar')).toBeNull();
        });
    });
});
