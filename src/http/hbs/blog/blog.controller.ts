import { Controller, Get, NotFoundException, Param, Render, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogService } from 'src/core/blog/blog.service';
import { BlogPostSummary } from 'src/core/blog/blog-post';
import { getLogger } from 'src/logger/global-app-logger';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';

interface BlogIndexViewDto extends BaseViewDto {
    posts: BlogPostSummary[];
}

interface BlogPostViewDto extends BaseViewDto {
    post: { slug: string; title: string; date: string; description: string; html: string };
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
    index(@Req() req: AuthenticatedRequest): BlogIndexViewDto {
        const posts = this.blogService.getPosts();
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
    post(@Req() req: AuthenticatedRequest, @Param('slug') slug: string): BlogPostViewDto {
        const post = this.blogService.getPost(slug);
        if (!post) {
            throw new NotFoundException('Blog post not found');
        }
        const url = `${this.appUrl}/blog/${post.slug}`;
        const jsonLd = JSON.stringify({
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
