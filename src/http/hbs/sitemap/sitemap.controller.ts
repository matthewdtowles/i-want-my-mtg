import { Controller, Get, Header, Inject, Param, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SetService } from 'src/core/set/set.service';

@Controller()
export class SitemapController {
    private readonly appUrl: string;

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(CardService) private readonly cardService: CardService,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @Get('sitemap.xml')
    @Header('Content-Type', 'application/xml')
    @Header('Cache-Control', 'public, max-age=86400')
    async getSitemapIndex(): Promise<string> {
        const options = new SafeQueryOptions({ limit: '10000' });
        const sets = await this.setService.findSets(options);
        const releasedSets = sets.filter(
            (s) => s.releaseDate && new Date(s.releaseDate) <= new Date()
        );

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        xml += `  <sitemap><loc>${this.escapeXml(this.appUrl)}/sitemap-static.xml</loc></sitemap>\n`;
        for (const set of releasedSets) {
            const code = encodeURIComponent(set.code);
            xml += `  <sitemap><loc>${this.escapeXml(this.appUrl)}/sitemap-sets-${this.escapeXml(code)}.xml</loc></sitemap>\n`;
        }
        xml += '</sitemapindex>';
        return xml;
    }

    @Get('sitemap-static.xml')
    @Header('Content-Type', 'application/xml')
    @Header('Cache-Control', 'public, max-age=86400')
    async getStaticSitemap(): Promise<string> {
        const options = new SafeQueryOptions({ limit: '10000' });
        const sets = await this.setService.findSets(options);
        const releasedSets = sets.filter(
            (s) => s.releaseDate && new Date(s.releaseDate) <= new Date()
        );

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        xml += this.urlEntry('/', 'daily', '1.0');
        xml += this.urlEntry('/sets', 'daily', '0.9');
        xml += this.urlEntry('/spoilers', 'daily', '0.8');
        for (const set of releasedSets) {
            xml += this.urlEntry(`/sets/${set.code}`, 'weekly', '0.7');
        }
        xml += '</urlset>';
        return xml;
    }

    @Get('sitemap-sets-:code.xml')
    @Header('Content-Type', 'application/xml')
    @Header('Cache-Control', 'public, max-age=86400')
    async getSetSitemap(@Param('code') code: string): Promise<string> {
        const set = await this.setService.findByCode(code);
        if (!set) {
            throw new NotFoundException(`Set not found: ${code}`);
        }

        const options = new SafeQueryOptions({ limit: '10000' });
        const cards = await this.cardService.findBySet(code, options);

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        for (const card of cards) {
            xml += this.urlEntry(`/card/${card.setCode}/${card.number}`, 'weekly', '0.6');
        }
        xml += '</urlset>';
        return xml;
    }

    private urlEntry(path: string, changefreq: string, priority: string): string {
        const encodedPath = path
            .split('/')
            .map((segment) => (segment ? encodeURIComponent(segment) : ''))
            .join('/');
        const loc = this.escapeXml(`${this.appUrl}${encodedPath}`);
        return (
            '  <url>\n' +
            `    <loc>${loc}</loc>\n` +
            `    <changefreq>${changefreq}</changefreq>\n` +
            `    <priority>${priority}</priority>\n` +
            '  </url>\n'
        );
    }

    private escapeXml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
