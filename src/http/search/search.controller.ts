import { Controller, Get, Inject, Query, Render, Req, UseGuards } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { safeSearchTerm } from 'src/core/query/query.util';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SearchViewDto } from './dto/search.view.dto';
import { SearchOrchestrator } from './search.orchestrator';

@Controller('search')
export class SearchController {
    constructor(
        @Inject(SearchOrchestrator) private readonly searchOrchestrator: SearchOrchestrator
    ) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('search')
    async search(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<SearchViewDto> {
        const term = safeSearchTerm(query.q);
        const options = new SafeQueryOptions(query);
        return await this.searchOrchestrator.search(req, term, options);
    }
}
