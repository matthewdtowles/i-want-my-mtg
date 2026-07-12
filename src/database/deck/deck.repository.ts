import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckRepositoryPort } from 'src/core/deck/ports/deck.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { latestPriceCondition } from 'src/database/query/latest-price.sql';
import { activeEntityManager } from 'src/database/transaction-runner';
import { DeckMapper } from './deck.mapper';
import { DeckOrmEntity } from './deck.orm-entity';

const LATEST_PRICE = latestPriceCondition('prices', 'card');

@Injectable()
export class DeckRepository implements DeckRepositoryPort {
    private readonly LOGGER = getLogger(DeckRepository.name);

    constructor(
        @InjectRepository(DeckOrmEntity)
        private readonly repository: Repository<DeckOrmEntity>
    ) {}

    /**
     * The repository bound to the active transaction (W2/B4) when one is open,
     * otherwise the default. Used by the create + add-cards path so a deck
     * import commits the deck and its cards atomically (no orphan empty deck).
     */
    private repo(): Repository<DeckOrmEntity> {
        return activeEntityManager()?.getRepository(DeckOrmEntity) ?? this.repository;
    }

    async findByUser(userId: number): Promise<Deck[]> {
        this.LOGGER.debug(`findByUser ${userId}.`);
        // Each deck with its cards + latest price (enough for card counts + value).
        const decks = await this.repository
            .createQueryBuilder('deck')
            .leftJoinAndSelect('deck.cards', 'dc')
            .leftJoinAndSelect('dc.card', 'card')
            .leftJoinAndSelect('card.prices', 'prices', LATEST_PRICE)
            .where('deck.userId = :userId', { userId })
            .orderBy('deck.updatedAt', 'DESC')
            .addOrderBy('card.name', 'ASC')
            .getMany();
        return decks.map((d) => DeckMapper.toCore(d));
    }

    async findById(deckId: number): Promise<Deck | null> {
        // Detail view also needs the set (keyrune) and legalities (format check).
        const deck = await this.repository
            .createQueryBuilder('deck')
            .leftJoinAndSelect('deck.cards', 'dc')
            .leftJoinAndSelect('dc.card', 'card')
            .leftJoinAndSelect('card.set', 'set')
            .leftJoinAndSelect('card.legalities', 'legalities')
            .leftJoinAndSelect('card.prices', 'prices', LATEST_PRICE)
            .where('deck.id = :deckId', { deckId })
            .addOrderBy('card.name', 'ASC')
            .getOne();
        return deck ? DeckMapper.toCore(deck) : null;
    }

    async getOwnerId(deckId: number): Promise<number | null> {
        const row = await this.repo().findOne({
            where: { id: deckId },
            select: { id: true, userId: true },
        });
        return row ? row.userId : null;
    }

    async create(deck: Deck): Promise<Deck> {
        const saved = await this.repo().save(DeckMapper.toOrmEntity(deck));
        return DeckMapper.toCore(saved);
    }

    async update(deck: Deck): Promise<Deck> {
        await this.repository.update(
            { id: deck.id },
            { name: deck.name, format: deck.format ?? null }
        );
        const reloaded = await this.repository.findOneOrFail({ where: { id: deck.id } });
        return DeckMapper.toCore(reloaded);
    }

    async delete(deckId: number): Promise<void> {
        await this.repository.delete({ id: deckId });
    }

    async addCard(
        deckId: number,
        cardId: string,
        isSideboard: boolean,
        delta: number
    ): Promise<number> {
        const rows = await this.repository.query(
            `INSERT INTO deck_card (deck_id, card_id, is_sideboard, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (deck_id, card_id, is_sideboard)
             DO UPDATE SET quantity = deck_card.quantity + EXCLUDED.quantity
             RETURNING quantity`,
            [deckId, cardId, isSideboard, delta]
        );
        await this.touch(deckId);
        return Number(rows[0]?.quantity ?? delta);
    }

    async addCards(
        deckId: number,
        entries: { cardId: string; isSideboard: boolean; quantity: number }[]
    ): Promise<void> {
        if (entries.length === 0) {
            return;
        }
        // One multi-row upsert; $1 is the deck id, each entry contributes a triplet.
        const params: unknown[] = [deckId];
        const values = entries
            .map((e) => {
                const base = params.length;
                params.push(e.cardId, e.isSideboard, e.quantity);
                return `($1, $${base + 1}, $${base + 2}, $${base + 3})`;
            })
            .join(', ');
        await this.repo().query(
            `INSERT INTO deck_card (deck_id, card_id, is_sideboard, quantity)
             VALUES ${values}
             ON CONFLICT (deck_id, card_id, is_sideboard)
             DO UPDATE SET quantity = deck_card.quantity + EXCLUDED.quantity`,
            params
        );
        await this.touch(deckId);
    }

    async setCardQuantity(
        deckId: number,
        cardId: string,
        isSideboard: boolean,
        quantity: number
    ): Promise<void> {
        await this.repository.query(
            `INSERT INTO deck_card (deck_id, card_id, is_sideboard, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (deck_id, card_id, is_sideboard)
             DO UPDATE SET quantity = EXCLUDED.quantity`,
            [deckId, cardId, isSideboard, quantity]
        );
        await this.touch(deckId);
    }

    async removeCard(deckId: number, cardId: string, isSideboard: boolean): Promise<void> {
        await this.repository.query(
            `DELETE FROM deck_card WHERE deck_id = $1 AND card_id = $2 AND is_sideboard = $3`,
            [deckId, cardId, isSideboard]
        );
        await this.touch(deckId);
    }

    async countByUser(userId: number): Promise<number> {
        return this.repository.count({ where: { userId } });
    }

    /** Bump updated_at so card edits float the deck to the top of the list. */
    private async touch(deckId: number): Promise<void> {
        await this.repo().query(`UPDATE deck SET updated_at = NOW() WHERE id = $1`, [deckId]);
    }
}
