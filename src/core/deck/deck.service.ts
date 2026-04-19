import { Inject, Injectable } from '@nestjs/common';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { getLogger } from 'src/logger/global-app-logger';
import { Deck } from './deck.entity';
import { DeckCard } from './deck-card.entity';
import { DeckRepositoryPort, DeckSummary } from './ports/deck.repository.port';

export interface DeckUpdateInput {
    name?: string;
    format?: Format | null;
    description?: string | null;
}

@Injectable()
export class DeckService {
    private readonly LOGGER = getLogger(DeckService.name);

    constructor(
        @Inject(DeckRepositoryPort) private readonly deckRepo: DeckRepositoryPort,
        @Inject(CardRepositoryPort) private readonly cardRepo: CardRepositoryPort
    ) {}

    async createDeck(deck: Deck): Promise<Deck> {
        this.LOGGER.debug(`createDeck user=${deck.userId} name=${deck.name}`);
        return this.deckRepo.createDeck(deck);
    }

    async findDecksForUser(userId: number): Promise<DeckSummary[]> {
        return this.deckRepo.findByUser(userId);
    }

    async findDecksForPicker(userId: number): Promise<Deck[]> {
        return this.deckRepo.findByUserBasic(userId);
    }

    async findDeckWithCards(deckId: number, userId: number): Promise<Deck> {
        const deck = await this.deckRepo.findByIdWithCards(deckId);
        if (!deck) throw new DomainNotFoundError('Deck not found');
        if (deck.userId !== userId) {
            throw new DomainNotAuthorizedError('Not authorized to view this deck');
        }
        return deck;
    }

    async updateDeck(deckId: number, userId: number, updates: DeckUpdateInput): Promise<Deck> {
        const existing = await this.ownedDeckOrThrow(deckId, userId);
        const next = new Deck({
            id: existing.id,
            userId: existing.userId,
            name: updates.name ?? existing.name,
            format: updates.format !== undefined ? updates.format : existing.format,
            description:
                updates.description !== undefined ? updates.description : existing.description,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        });
        return this.deckRepo.updateDeck(next);
    }

    async deleteDeck(deckId: number, userId: number): Promise<void> {
        await this.ownedDeckOrThrow(deckId, userId);
        await this.deckRepo.deleteDeck(deckId);
    }

    async setCardQuantity(
        deckId: number,
        userId: number,
        cardId: string,
        quantity: number,
        isSideboard: boolean
    ): Promise<void> {
        if (!Number.isInteger(quantity) || quantity < 0) {
            throw new DomainValidationError('Quantity must be a non-negative integer');
        }
        const deck = await this.ownedDeckOrThrow(deckId, userId);
        if (quantity === 0) {
            await this.deckRepo.removeCard(deckId, cardId, isSideboard);
            return;
        }
        const card = await this.cardRepo.findById(cardId, ['legalities']);
        if (!card) throw new DomainNotFoundError('Card not found');
        if (deck.format) {
            const legality = card.legalities?.find((l) => l.format === deck.format);
            if (legality?.status === LegalityStatus.Banned) {
                throw new DomainValidationError(
                    `${card.name} is banned in ${deck.format}`
                );
            }
        }
        await this.deckRepo.upsertCard(
            new DeckCard({ deckId, cardId, quantity, isSideboard })
        );
    }

    private async ownedDeckOrThrow(deckId: number, userId: number): Promise<Deck> {
        const deck = await this.deckRepo.findById(deckId);
        if (!deck) throw new DomainNotFoundError('Deck not found');
        if (deck.userId !== userId) {
            throw new DomainNotAuthorizedError('Not authorized to modify this deck');
        }
        return deck;
    }
}
