import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { PublishedDeck } from './published-deck.entity';
import { PublishedDeckRepositoryPort } from './ports/published-deck.repository.port';

@Injectable()
export class PublishedDeckService {
    private readonly LOGGER = getLogger(PublishedDeckService.name);

    constructor(
        @Inject(PublishedDeckRepositoryPort)
        private readonly repository: PublishedDeckRepositoryPort
    ) {}

    /**
     * A page of published decks for one format's row, plus whether more exist.
     * Fetches limit+1 and derives `hasMore` from the slice, so no COUNT query is
     * needed per row (or per lazy-load fetch).
     */
    async rowPage(
        format: string | undefined,
        limit: number,
        offset: number
    ): Promise<{ decks: PublishedDeck[]; hasMore: boolean }> {
        const rows = await this.repository.findPage({ format, limit: limit + 1, offset });
        const hasMore = rows.length > limit;
        return { decks: hasMore ? rows.slice(0, limit) : rows, hasMore };
    }

    async get(id: number): Promise<PublishedDeck | null> {
        return this.repository.findById(id);
    }

    async formats(): Promise<string[]> {
        return this.repository.distinctFormats();
    }
}
