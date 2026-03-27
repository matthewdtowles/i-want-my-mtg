import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetOrchestrator } from './set.orchestrator';

@Controller('spoilers')
export class SpoilersController {
    private readonly appUrl: string;

    constructor(
        @Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('spoilers')
    async findSpoilers(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        const view = await this.setOrchestrator.findSpoilersList(req, [
            { label: 'Home', url: '/' },
            { label: 'Sets', url: '/sets' },
            { label: 'Spoilers', url: '/spoilers' },
        ]);
        view.title = 'Upcoming Sets — I Want My MTG';
        view.metaDescription = 'Preview upcoming Magic: The Gathering sets before they release.';
        view.indexable = true;
        view.canonicalUrl = `${this.appUrl}/spoilers`;
        return view;
    }
}
