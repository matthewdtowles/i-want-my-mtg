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

export interface SuggestResult {
    cards: Card[];
    sets: Set[];
}

@Injectable()
export class SearchService {
    private readonly LOGGER = getLogger(SearchService.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(SetService) private readonly setService: SetService
    ) {}

    async suggest(term: string, cardLimit = 5, setLimit = 3): Promise<SuggestResult> {
        if (!term || term.trim().length < 2) {
            return { cards: [], sets: [] };
        }
        this.LOGGER.debug(`Suggest for: ${term}.`);
        const cardOptions = new SafeQueryOptions({ page: '1', limit: String(cardLimit) });
        const setOptions = new SafeQueryOptions({ page: '1', limit: String(setLimit) });
        const [cards, sets] = await Promise.all([
            this.cardService.searchByName(term, cardOptions),
            this.setService.searchSets(term, setOptions),
        ]);
        return { cards, sets };
    }

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
