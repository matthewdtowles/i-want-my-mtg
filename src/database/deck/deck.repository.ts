import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import {
    DeckRepositoryPort,
    DeckSummary,
} from 'src/core/deck/ports/deck.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { DeckCardOrmEntity } from './deck-card.orm-entity';
import { DeckCardMapper, DeckMapper } from './deck.mapper';
import { DeckOrmEntity } from './deck.orm-entity';

@Injectable()
export class DeckRepository implements DeckRepositoryPort {
    private readonly LOGGER = getLogger(DeckRepository.name);

    constructor(
        @InjectRepository(DeckOrmEntity)
        private readonly deckRepo: Repository<DeckOrmEntity>,
        @InjectRepository(DeckCardOrmEntity)
        private readonly deckCardRepo: Repository<DeckCardOrmEntity>
    ) {}

    async createDeck(deck: Deck): Promise<Deck> {
        const orm = DeckMapper.toOrm(deck);
        const saved = await this.deckRepo.save(orm);
        return DeckMapper.toCore(saved);
    }

    async updateDeck(deck: Deck): Promise<Deck> {
        if (deck.id == null) {
            throw new Error('updateDeck requires deck.id');
        }
        await this.deckRepo.update(
            { id: deck.id },
            {
                name: deck.name,
                format: deck.format,
                description: deck.description,
            }
        );
        const reloaded = await this.deckRepo.findOne({ where: { id: deck.id } });
        return DeckMapper.toCore(reloaded);
    }

    async findById(deckId: number): Promise<Deck | null> {
        const orm = await this.deckRepo.findOne({ where: { id: deckId } });
        return orm ? DeckMapper.toCore(orm) : null;
    }

    async findByIdWithCards(deckId: number): Promise<Deck | null> {
        const orm = await this.deckRepo.findOne({ where: { id: deckId } });
        if (!orm) return null;
        const cards = await this.findCards(deckId);
        return DeckMapper.toCore(orm, cards);
    }

    async findByUser(userId: number): Promise<DeckSummary[]> {
        const decks = await this.deckRepo.find({
            where: { userId },
            order: { updatedAt: 'DESC' },
        });
        if (decks.length === 0) return [];

        const counts = await this.deckCardRepo
            .createQueryBuilder('dc')
            .select('dc.deck_id', 'deckId')
            .addSelect(
                "COALESCE(SUM(CASE WHEN dc.is_sideboard = false THEN dc.quantity ELSE 0 END), 0)",
                'mainCount'
            )
            .addSelect(
                "COALESCE(SUM(CASE WHEN dc.is_sideboard = true THEN dc.quantity ELSE 0 END), 0)",
                'sideboardCount'
            )
            .where('dc.deck_id IN (:...ids)', { ids: decks.map((d) => d.id) })
            .groupBy('dc.deck_id')
            .getRawMany();

        const countMap = new Map<number, { main: number; side: number }>();
        for (const row of counts) {
            countMap.set(Number(row.deckId), {
                main: Number(row.mainCount),
                side: Number(row.sideboardCount),
            });
        }

        return decks.map((orm) => {
            const c = countMap.get(orm.id) ?? { main: 0, side: 0 };
            return {
                deck: DeckMapper.toCore(orm),
                cardCount: c.main,
                sideboardCount: c.side,
            };
        });
    }

    async deleteDeck(deckId: number): Promise<void> {
        await this.deckRepo.delete({ id: deckId });
    }

    async upsertCard(entry: DeckCard): Promise<void> {
        await this.deckCardRepo.query(
            `INSERT INTO deck_card (deck_id, card_id, is_sideboard, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (deck_id, card_id, is_sideboard) DO UPDATE SET quantity = EXCLUDED.quantity`,
            [entry.deckId, entry.cardId, entry.isSideboard, entry.quantity]
        );
        await this.deckRepo.update({ id: entry.deckId }, { updatedAt: new Date() });
    }

    async removeCard(deckId: number, cardId: string, isSideboard: boolean): Promise<void> {
        await this.deckCardRepo.delete({ deckId, cardId, isSideboard });
        await this.deckRepo.update({ id: deckId }, { updatedAt: new Date() });
    }

    async findCards(deckId: number): Promise<DeckCard[]> {
        const rows = await this.deckCardRepo
            .createQueryBuilder('dc')
            .leftJoinAndSelect('dc.card', 'card')
            .leftJoinAndSelect('card.set', 'set')
            .leftJoinAndSelect(
                'card.prices',
                'prices',
                'prices.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = card.id)'
            )
            .where('dc.deck_id = :deckId', { deckId })
            .orderBy('dc.is_sideboard', 'ASC')
            .addOrderBy('card.name', 'ASC')
            .getMany();
        return rows.map(DeckCardMapper.toCore);
    }
}
