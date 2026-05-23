import { Controller, Get, NotFoundException, Param, Render, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogService } from 'src/core/blog/blog.service';
import { BlogPost, BlogPostSummary } from 'src/core/blog/blog-post';
import { getLogger } from 'src/logger/global-app-logger';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
import { buildJsonLd } from 'src/http/base/json-ld.util';

interface BlogIndexViewDto extends BaseViewDto {
    posts: BlogPostSummary[];
}

interface BlogPostViewDto extends BaseViewDto {
    post: BlogPost;
}

@Controller('blog')
export class BlogController {
    private readonly LOGGER = getLogger(BlogController.name);
    private readonly appUrl: string;

    constructor(
        private readonly blogService: BlogService,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('blog')
    async index(@Req() req: AuthenticatedRequest): Promise<BlogIndexViewDto> {
        const posts = await this.blogService.getPosts();
        this.LOGGER.log(`Blog index - ${posts.length} posts.`);
        return Object.assign(
            new BaseViewDto({
                authenticated: !!req.user,
                indexable: true,
                title: 'Blog - I Want My MTG',
                metaDescription:
                    'Guides, market notes, and product updates for Magic: The Gathering collectors.',
                canonicalUrl: `${this.appUrl}/blog`,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Blog', url: '/blog' },
                ],
            }),
            { posts }
        );
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':slug')
    @Render('blogPost')
    async post(
        @Req() req: AuthenticatedRequest,
        @Param('slug') slug: string
    ): Promise<BlogPostViewDto> {
        const post = await this.blogService.getPost(slug);
        if (!post) {
            throw new NotFoundException('Blog post not found');
        }
        const url = `${this.appUrl}/blog/${post.slug}`;
        const jsonLd = buildJsonLd({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            url,
            mainEntityOfPage: url,
        });
        return Object.assign(
            new BaseViewDto({
                authenticated: !!req.user,
                indexable: true,
                title: `${post.title} - I Want My MTG`,
                metaDescription: post.description,
                canonicalUrl: url,
                jsonLd,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Blog', url: '/blog' },
                    { label: post.title, url: `/blog/${post.slug}` },
                ],
            }),
            { post }
        );
    }
}
