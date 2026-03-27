import { Controller, Get, Header, Inject, Render, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { join } from 'path';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetListViewDto } from 'src/http/hbs/set/dto/set-list.view.dto';
import { SetOrchestrator } from 'src/http/hbs/set/set.orchestrator';

@Controller()
export class HomeController {
    private readonly LOGGER = getLogger(HomeController.name);
    private readonly appUrl: string;

    constructor(
        @Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @UseGuards(OptionalAuthGuard)
    @Get('/')
    @Render('home')
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.log(`Home page - find initial set list.`);
        const options: SafeQueryOptions = new SafeQueryOptions(req.query);
        const setListView = await this.setOrchestrator.findSetList(req, [], options);
        setListView.indexable = true;
        setListView.title = 'I Want My MTG — Magic: The Gathering Collection Tracker';
        setListView.metaDescription =
            'Track your Magic: The Gathering collection, discover set values, and manage your inventory with I Want My MTG.';
        setListView.canonicalUrl = this.appUrl;
        setListView.ogImage = `${this.appUrl}/public/images/logo.webp`;
        this.LOGGER.log(
            `Found initial set list with ${setListView?.setList?.length} sets on Home page.`
        );
        return setListView;
    }

    @Get('offline')
    @Render('offline')
    getOfflinePage(): { title: string } {
        return { title: 'Offline - I Want My MTG' };
    }

    @Get('sw.js')
    @Header('Content-Type', 'application/javascript')
    @Header('Cache-Control', 'no-cache')
    @Header('Service-Worker-Allowed', '/')
    getServiceWorker(@Res() res: Response): void {
        res.sendFile(join(__dirname, '..', '..', 'public', 'sw.js'));
    }

    @Get('favicon.ico')
    @Header('Content-Type', 'image/x-icon')
    @Header('Cache-Control', 'public, max-age=604800')
    getFavicon(@Res() res: Response): void {
        res.sendFile(join(__dirname, '..', '..', 'public', 'favicon.ico'));
    }

    @Get('google8ee9d366f7b1f432.html')
    @Header('Content-Type', 'text/html')
    getGoogleVerification(): string {
        return 'google-site-verification: google8ee9d366f7b1f432.html';
    }

    @Get('robots.txt')
    @Header('Content-Type', 'text/plain')
    getRobotsTxt(): string {
        return [
            'User-agent: *',
            'Allow: /',
            '',
            'Disallow: /auth',
            'Disallow: /user',
            'Disallow: /inventory',
            'Disallow: /search/suggest',
            '',
            'Crawl-delay: 1',
            '',
            `Sitemap: ${this.appUrl}/sitemap.xml`,
        ].join('\n');
    }
}
