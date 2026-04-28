import { Controller, Get, Header, Inject, Render, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { join } from 'path';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
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
        setListView.title = 'I Want My MTG - Magic: The Gathering Collection Tracker';
        setListView.metaDescription =
            'Track your Magic: The Gathering collection, discover set values, and manage your inventory with I Want My MTG.';
        setListView.canonicalUrl = this.appUrl;
        setListView.ogImage = `${this.appUrl}/public/images/logo.webp`;
        this.LOGGER.log(
            `Found initial set list with ${setListView?.setList?.length} sets on Home page.`
        );
        return setListView;
    }

    @UseGuards(OptionalAuthGuard)
    @Get('guides/getting-started')
    @Render('gettingStarted')
    getGettingStartedGuide(@Req() req: AuthenticatedRequest): BaseViewDto {
        return new BaseViewDto({
            authenticated: !!req.user,
            indexable: true,
            title: 'Getting Started - I Want My MTG',
            metaDescription:
                'Learn how to track your Magic: The Gathering collection, log transactions, and use the portfolio and binder features.',
            canonicalUrl: `${this.appUrl}/guides/getting-started`,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Getting Started', url: '/guides/getting-started' },
            ],
        });
    }

    @UseGuards(OptionalAuthGuard)
    @Get('privacy')
    @Render('privacy')
    getPrivacyPolicy(@Req() req: AuthenticatedRequest): BaseViewDto {
        return new BaseViewDto({
            authenticated: !!req.user,
            indexable: true,
            title: 'Privacy Policy - I Want My MTG',
            metaDescription:
                'Privacy policy for I Want My MTG: what data we collect, how it is used, and your choices.',
            canonicalUrl: `${this.appUrl}/privacy`,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Privacy Policy', url: '/privacy' },
            ],
        });
    }

    @UseGuards(OptionalAuthGuard)
    @Get('terms')
    @Render('terms')
    getTermsOfService(@Req() req: AuthenticatedRequest): BaseViewDto {
        return new BaseViewDto({
            authenticated: !!req.user,
            indexable: true,
            title: 'Terms of Service - I Want My MTG',
            metaDescription:
                'Terms of service for I Want My MTG, a Magic: The Gathering collection tracker.',
            canonicalUrl: `${this.appUrl}/terms`,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Terms of Service', url: '/terms' },
            ],
        });
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
