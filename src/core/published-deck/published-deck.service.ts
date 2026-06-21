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

    /** A page of published decks plus the total for pagination. */
    async list(
        format: string | undefined,
        limit: number,
        offset: number
    ): Promise<{ decks: PublishedDeck[]; total: number }> {
        const [decks, total] = await Promise.all([
            this.repository.findPage({ format, limit, offset }),
            this.repository.count({ format }),
        ]);
        return { decks, total };
    }

    async get(id: number): Promise<PublishedDeck | null> {
        return this.repository.findById(id);
    }

    async formats(): Promise<string[]> {
        return this.repository.distinctFormats();
    }
}
