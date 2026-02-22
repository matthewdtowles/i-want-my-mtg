import { Controller, Get, Inject, Query, Render, Req, UseGuards } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
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
    async findSpoilers(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<SetListViewDto> {
        const options = new SafeQueryOptions(query);
        return await this.setOrchestrator.findSpoilersList(
            req,
            [
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
                { label: 'Spoilers', url: '/spoilers' },
            ],
            options
        );
    }
}
