import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Set } from 'src/core/set/set.entity';
import { SetService } from 'src/core/set/set.service';
import { getLogger } from 'src/logger/global-app-logger';

export interface SearchResult {
    cards: Card[];
    cardTotal: number;
    sets: Set[];
    setTotal: number;
}

@Injectable()
export class SearchService {
    private readonly LOGGER = getLogger(SearchService.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(SetService) private readonly setService: SetService
    ) {}

    async search(term: string, options: SafeQueryOptions): Promise<SearchResult> {
        this.LOGGER.debug(`Searching for: ${term}.`);
        const [cards, cardTotal, sets, setTotal] = await Promise.all([
            this.cardService.searchByName(term, options),
            this.cardService.totalSearchByName(term),
            this.setService.searchSets(term, options),
            this.setService.totalSearchSets(term),
        ]);
        this.LOGGER.debug(`Search results for "${term}": ${cardTotal} cards, ${setTotal} sets.`);
        return { cards, cardTotal, sets, setTotal };
    }
}
