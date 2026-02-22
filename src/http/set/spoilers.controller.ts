import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetOrchestrator } from './set.orchestrator';

@Controller('spoilers')
export class SpoilersController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('spoilers')
    async findSpoilers(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return await this.setOrchestrator.findSpoilersList(req, [
            { label: 'Home', url: '/' },
            { label: 'Sets', url: '/sets' },
            { label: 'Spoilers', url: '/spoilers' },
        ]);
    }
}
