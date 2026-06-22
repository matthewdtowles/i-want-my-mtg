import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublishedDeck } from 'src/core/published-deck/published-deck.entity';
import {
    PublishedDeckListFilter,
    PublishedDeckRepositoryPort,
} from 'src/core/published-deck/ports/published-deck.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { PublishedDeckMapper } from './published-deck.mapper';
import { PublishedDeckOrmEntity } from './published-deck.orm-entity';

const LATEST_PRICE = 'prices.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = card.id)';

@Injectable()
export class PublishedDeckRepository implements PublishedDeckRepositoryPort {
    private readonly LOGGER = getLogger(PublishedDeckRepository.name);

    constructor(
        @InjectRepository(PublishedDeckOrmEntity)
        private readonly repository: Repository<PublishedDeckOrmEntity>
    ) {}

    async findPage(filter: PublishedDeckListFilter): Promise<PublishedDeck[]> {
        // Page the decks first (so limit/offset count decks, not joined rows),
        // then load their cards + latest price for counts/value.
        const pageQb = this.repository
            .createQueryBuilder('deck')
            .orderBy('deck.tournamentDate', 'DESC')
            .addOrderBy('deck.id', 'DESC')
            .take(filter.limit)
            .skip(filter.offset);
        if (filter.format) {
            pageQb.where('deck.format = :format', { format: filter.format });
        }
        const ids = (await pageQb.getMany()).map((d) => d.id);
        if (ids.length === 0) {
            return [];
        }

        const decks = await this.repository
            .createQueryBuilder('deck')
            .leftJoinAndSelect('deck.cards', 'dc')
            .leftJoinAndSelect('dc.card', 'card')
            .leftJoinAndSelect('card.prices', 'prices', LATEST_PRICE)
            .where('deck.id IN (:...ids)', { ids })
            .orderBy('deck.tournamentDate', 'DESC')
            .addOrderBy('deck.id', 'DESC')
            .getMany();
        return decks.map((d) => PublishedDeckMapper.toCore(d));
    }

    async findById(id: number): Promise<PublishedDeck | null> {
        const deck = await this.repository
            .createQueryBuilder('deck')
            .leftJoinAndSelect('deck.cards', 'dc')
            .leftJoinAndSelect('dc.card', 'card')
            .leftJoinAndSelect('card.set', 'set')
            .leftJoinAndSelect('card.legalities', 'legalities')
            .leftJoinAndSelect('card.prices', 'prices', LATEST_PRICE)
            .where('deck.id = :id', { id })
            .addOrderBy('card.name', 'ASC')
            .getOne();
        return deck ? PublishedDeckMapper.toCore(deck) : null;
    }

    async distinctFormats(): Promise<string[]> {
        const rows = await this.repository
            .createQueryBuilder('deck')
            .select('DISTINCT deck.format', 'format')
            .where('deck.format IS NOT NULL')
            .orderBy('deck.format', 'ASC')
            .getRawMany<{ format: string }>();
        return rows.map((r) => r.format);
    }
}
