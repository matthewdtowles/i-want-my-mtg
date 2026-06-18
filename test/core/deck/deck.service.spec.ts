import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Format } from 'src/core/card/format.enum';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { DeckRepositoryPort } from 'src/core/deck/ports/deck.repository.port';

describe('DeckService', () => {
    let service: DeckService;
    let repo: jest.Mocked<Record<string, jest.Mock>>;

    beforeEach(async () => {
        repo = {
            findByUser: jest.fn(),
            findById: jest.fn(),
            getOwnerId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addCard: jest.fn(),
            setCardQuantity: jest.fn(),
            removeCard: jest.fn(),
            countByUser: jest.fn(),
        };
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [DeckService, { provide: DeckRepositoryPort, useValue: repo }],
        }).compile();
        service = moduleRef.get(DeckService);
    });

    describe('getDeck', () => {
        it('returns the deck when owned by the user', async () => {
            repo.findById.mockResolvedValue(new Deck({ id: 1, userId: 7, name: 'd' }));
            expect(await service.getDeck(1, 7)).not.toBeNull();
        });
        it('returns null when the deck belongs to someone else', async () => {
            repo.findById.mockResolvedValue(new Deck({ id: 1, userId: 99, name: 'd' }));
            expect(await service.getDeck(1, 7)).toBeNull();
        });
        it('returns null when the deck is missing', async () => {
            repo.findById.mockResolvedValue(null);
            expect(await service.getDeck(1, 7)).toBeNull();
        });
    });

    describe('createDeck', () => {
        it('trims the name and creates the deck', async () => {
            repo.create.mockImplementation(async (d: Deck) => d);
            const deck = await service.createDeck(7, '  Aggro  ', Format.Modern);
            expect(deck.name).toBe('Aggro');
            expect(deck.format).toBe(Format.Modern);
        });
        it('throws BadRequest (400) on an empty name', async () => {
            await expect(service.createDeck(7, '   ')).rejects.toBeInstanceOf(BadRequestException);
            expect(repo.create).not.toHaveBeenCalled();
        });
    });

    describe('addCard', () => {
        it('checks ownership then adds', async () => {
            repo.getOwnerId.mockResolvedValue(7);
            await service.addCard(1, 7, 'card-1', false, 2);
            expect(repo.addCard).toHaveBeenCalledWith(1, 'card-1', false, 2);
        });
        it('throws NotFound when the deck is not the user’s', async () => {
            repo.getOwnerId.mockResolvedValue(99);
            await expect(service.addCard(1, 7, 'card-1', false, 1)).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(repo.addCard).not.toHaveBeenCalled();
        });
        it('no-ops on a non-positive quantity (no ownership check needed)', async () => {
            await service.addCard(1, 7, 'card-1', false, 0);
            expect(repo.getOwnerId).not.toHaveBeenCalled();
            expect(repo.addCard).not.toHaveBeenCalled();
        });
    });

    describe('setCardQuantity', () => {
        it('removes the card when quantity <= 0', async () => {
            repo.getOwnerId.mockResolvedValue(7);
            await service.setCardQuantity(1, 7, 'card-1', false, 0);
            expect(repo.removeCard).toHaveBeenCalledWith(1, 'card-1', false);
            expect(repo.setCardQuantity).not.toHaveBeenCalled();
        });
        it('sets the absolute quantity otherwise', async () => {
            repo.getOwnerId.mockResolvedValue(7);
            await service.setCardQuantity(1, 7, 'card-1', true, 3);
            expect(repo.setCardQuantity).toHaveBeenCalledWith(1, 'card-1', true, 3);
        });
    });

    describe('deleteDeck', () => {
        it('throws NotFound when not the owner', async () => {
            repo.getOwnerId.mockResolvedValue(99);
            await expect(service.deleteDeck(1, 7)).rejects.toBeInstanceOf(NotFoundException);
            expect(repo.delete).not.toHaveBeenCalled();
        });
        it('deletes when the owner', async () => {
            repo.getOwnerId.mockResolvedValue(7);
            await service.deleteDeck(1, 7);
            expect(repo.delete).toHaveBeenCalledWith(1);
        });
    });
});
