import { Controller, Get, Inject, Query, Render, Req, UseGuards } from '@nestjs/common';
import { SearchQueryOptions } from 'src/core/query/search-query-options.dto';
import { safeSearchTerm } from 'src/core/query/query.util';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SearchSuggestResponseDto } from './dto/search-suggest.dto';
import { SearchViewDto } from './dto/search.view.dto';
import { SearchOrchestrator } from './search.orchestrator';

@Controller('search')
export class SearchController {
    constructor(
        @Inject(SearchOrchestrator) private readonly searchOrchestrator: SearchOrchestrator
    ) {}

    @Get('suggest')
    async suggest(@Query('q') q: string): Promise<SearchSuggestResponseDto> {
        const term = safeSearchTerm(q) || '';
        return await this.searchOrchestrator.suggest(term);
    }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('search')
    async search(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<SearchViewDto> {
        const options = new SearchQueryOptions(query);
        const view = await this.searchOrchestrator.search(req, options);
        view.title = options.q ? `Search: ${options.q} — I Want My MTG` : 'Search — I Want My MTG';
        view.metaDescription = 'Search for Magic: The Gathering cards and sets.';
        return view;
    }
}
