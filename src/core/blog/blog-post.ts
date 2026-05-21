/**
 * Blog posts are file-based: each post is a markdown file with YAML
 * frontmatter under `src/http/content/blog/`. There is no database table.
 */

export interface BlogPostSummary {
    /** URL slug, derived from the markdown filename (without `.md`). */
    slug: string;
    title: string;
    /** Publish date as `YYYY-MM-DD`. */
    date: string;
    description: string;
}

export interface BlogPost extends BlogPostSummary {
    /** Rendered HTML of the markdown body. */
    html: string;
}
