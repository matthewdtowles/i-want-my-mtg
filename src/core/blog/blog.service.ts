import { Injectable } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getLogger } from 'src/logger/global-app-logger';
import { BlogPost, BlogPostSummary } from './blog-post';

// `import X = require()` form: these packages are CommonJS and the project
// compiles without `esModuleInterop`, so a default import would emit a bare
// `.default` access that is undefined at runtime.
import matter = require('gray-matter');
import MarkdownIt = require('markdown-it');

/**
 * Reads blog posts from markdown files copied into the build under
 * `http/content/blog/`. Posts are read on each request; the post count is
 * small enough that caching is not worth the staleness it introduces.
 */
@Injectable()
export class BlogService {
    private readonly LOGGER = getLogger(BlogService.name);
    private readonly contentDir = join(__dirname, '..', '..', 'http', 'content', 'blog');
    private readonly markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

    /** All posts, newest first. Posts with invalid frontmatter are skipped. */
    getPosts(): BlogPostSummary[] {
        return this.readSlugs()
            .map((slug) => this.parse(slug))
            .filter((post): post is BlogPost => post !== null)
            .map(({ html: _html, ...summary }) => summary)
            .sort((a, b) => b.date.localeCompare(a.date));
    }

    /** A single post by slug, or null if it does not exist or is malformed. */
    getPost(slug: string): BlogPost | null {
        if (!/^[a-z0-9-]+$/.test(slug)) {
            return null;
        }
        return this.parse(slug);
    }

    private readSlugs(): string[] {
        if (!existsSync(this.contentDir)) {
            this.LOGGER.warn(`Blog content directory not found: ${this.contentDir}`);
            return [];
        }
        return readdirSync(this.contentDir)
            .filter((file) => file.endsWith('.md'))
            .map((file) => file.replace(/\.md$/, ''));
    }

    private parse(slug: string): BlogPost | null {
        const path = join(this.contentDir, `${slug}.md`);
        if (!existsSync(path)) {
            return null;
        }
        try {
            const { data, content } = matter(readFileSync(path, 'utf-8'));
            if (!data.title || !data.date || !data.description) {
                this.LOGGER.warn(`Blog post '${slug}' is missing required frontmatter; skipping.`);
                return null;
            }
            return {
                slug,
                title: String(data.title),
                date: this.toIsoDate(data.date),
                description: String(data.description),
                html: this.markdown.render(content),
            };
        } catch (error) {
            this.LOGGER.error(`Failed to parse blog post '${slug}': ${error}`);
            return null;
        }
    }

    /** gray-matter parses an unquoted YAML date into a Date; normalize to YYYY-MM-DD. */
    private toIsoDate(value: unknown): string {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        return String(value);
    }
}
