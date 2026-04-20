import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { Format } from 'src/core/card/format.enum';
import { Legality } from 'src/core/card/legality.entity';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckRepositoryPort } from 'src/core/deck/ports/deck.repository.port';
import { DeckService } from 'src/core/deck/deck.service';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';

describe('DeckService', () => {
    let service: DeckService;

    const mockDeckRepo = {
        createDeck: jest.fn(),
        updateDeck: jest.fn(),
        findById: jest.fn(),
        findByIdWithCards: jest.fn(),
        findByUser: jest.fn(),
        findByUserBasic: jest.fn(),
        deleteDeck: jest.fn(),
        upsertCard: jest.fn(),
        removeCard: jest.fn(),
        findCards: jest.fn(),
    };

    const mockCardRepo = {
        findById: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeckService,
                { provide: DeckRepositoryPort, useValue: mockDeckRepo },
                { provide: CardRepositoryPort, useValue: mockCardRepo },
            ],
        }).compile();
        service = module.get(DeckService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const ownedDeck = (overrides: Partial<Deck> = {}) =>
        new Deck({ id: 1, userId: 10, name: 'Mine', ...overrides });

    describe('createDeck', () => {
        it('persists a new deck', async () => {
            mockDeckRepo.createDeck.mockResolvedValue(ownedDeck());
            const result = await service.createDeck(
                new Deck({ userId: 10, name: 'Mine', format: Format.Modern })
            );
            expect(result.userId).toBe(10);
            expect(mockDeckRepo.createDeck).toHaveBeenCalled();
        });

    });

    describe('updateDeck', () => {
        it('updates allowed fields when owner', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck());
            mockDeckRepo.updateDeck.mockImplementation(async (d) => d);
            const updated = await service.updateDeck(1, 10, {
                name: 'New Name',
                format: Format.Legacy,
            });
            expect(updated.name).toBe('New Name');
            expect(updated.format).toBe(Format.Legacy);
        });

        it('throws DomainNotFoundError when deck missing', async () => {
            mockDeckRepo.findById.mockResolvedValue(null);
            await expect(service.updateDeck(1, 10, { name: 'x' })).rejects.toBeInstanceOf(
                DomainNotFoundError
            );
        });

        it('throws DomainNotAuthorizedError when not owner', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ userId: 99 }));
            await expect(service.updateDeck(1, 10, { name: 'x' })).rejects.toBeInstanceOf(
                DomainNotAuthorizedError
            );
        });
    });

    describe('deleteDeck', () => {
        it('deletes when owner', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck());
            await service.deleteDeck(1, 10);
            expect(mockDeckRepo.deleteDeck).toHaveBeenCalledWith(1);
        });

        it('throws not authorized when not owner', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ userId: 99 }));
            await expect(service.deleteDeck(1, 10)).rejects.toBeInstanceOf(
                DomainNotAuthorizedError
            );
        });
    });

    describe('findDeckWithCards', () => {
        it('returns deck when owner', async () => {
            const deck = ownedDeck();
            mockDeckRepo.findByIdWithCards.mockResolvedValue(deck);
            const result = await service.findDeckWithCards(1, 10);
            expect(result).toBe(deck);
        });

        it('throws not authorized when not owner', async () => {
            mockDeckRepo.findByIdWithCards.mockResolvedValue(ownedDeck({ userId: 99 }));
            await expect(service.findDeckWithCards(1, 10)).rejects.toBeInstanceOf(
                DomainNotAuthorizedError
            );
        });

        it('throws not found when deck missing', async () => {
            mockDeckRepo.findByIdWithCards.mockResolvedValue(null);
            await expect(service.findDeckWithCards(1, 10)).rejects.toBeInstanceOf(
                DomainNotFoundError
            );
        });
    });

    describe('setCardQuantity', () => {
        const card = (id: string, legalities: Legality[] = []) =>
            new Card({
                id,
                setCode: 'XYZ',
                name: 'Card',
                number: '1',
                sortNumber: '1',
                rarity: 'common' as any,
                imgSrc: 'x.png',
                type: 'Creature',
                legalities,
            } as any);

        it('upserts when card exists and not banned', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ format: Format.Modern }));
            mockCardRepo.findById.mockResolvedValue(card('c1'));
            await service.setCardQuantity(1, 10, 'c1', 4, false);
            expect(mockDeckRepo.upsertCard).toHaveBeenCalled();
        });

        it('removes when quantity is 0', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck());
            await service.setCardQuantity(1, 10, 'c1', 0, false);
            expect(mockDeckRepo.removeCard).toHaveBeenCalledWith(1, 'c1', false);
            expect(mockDeckRepo.upsertCard).not.toHaveBeenCalled();
        });

        it('rejects when card is banned in the deck format', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ format: Format.Modern }));
            mockCardRepo.findById.mockResolvedValue(
                card('c1', [
                    new Legality({
                        cardId: 'c1',
                        format: Format.Modern,
                        status: LegalityStatus.Banned,
                    }),
                ])
            );
            await expect(
                service.setCardQuantity(1, 10, 'c1', 4, false)
            ).rejects.toBeInstanceOf(DomainValidationError);
            expect(mockDeckRepo.upsertCard).not.toHaveBeenCalled();
        });

        it('allows banned cards in freestyle decks (format=null)', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ format: null }));
            mockCardRepo.findById.mockResolvedValue(
                card('c1', [
                    new Legality({
                        cardId: 'c1',
                        format: Format.Modern,
                        status: LegalityStatus.Banned,
                    }),
                ])
            );
            await service.setCardQuantity(1, 10, 'c1', 1, false);
            expect(mockDeckRepo.upsertCard).toHaveBeenCalled();
        });

        it('rejects when not owner', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck({ userId: 99 }));
            await expect(
                service.setCardQuantity(1, 10, 'c1', 1, false)
            ).rejects.toBeInstanceOf(DomainNotAuthorizedError);
        });

        it('rejects when card does not exist', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck());
            mockCardRepo.findById.mockResolvedValue(null);
            await expect(
                service.setCardQuantity(1, 10, 'c1', 1, false)
            ).rejects.toBeInstanceOf(DomainNotFoundError);
        });

        it('rejects negative quantity', async () => {
            mockDeckRepo.findById.mockResolvedValue(ownedDeck());
            await expect(
                service.setCardQuantity(1, 10, 'c1', -1, false)
            ).rejects.toBeInstanceOf(DomainValidationError);
        });
    });
});
