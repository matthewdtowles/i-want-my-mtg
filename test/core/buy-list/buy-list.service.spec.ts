import { Test, TestingModule } from '@nestjs/testing';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { BuyListRepositoryPort } from 'src/core/buy-list/ports/buy-list.repository.port';
import { Card } from 'src/core/card/card.entity';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';

function makeCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-1',
        imgSrc: 'a/b/card-1.jpg',
        name: 'Sol Ring',
        number: '1',
        rarity: 'uncommon' as Card['rarity'],
        setCode: 'cmd',
        sortNumber: '1',
        type: 'Artifact',
        legalities: [],
        hasFoil: true,
        hasNonFoil: true,
        ...overrides,
    });
}

describe('BuyListService', () => {
    let service: BuyListService;
    let repo: jest.Mocked<BuyListRepositoryPort>;
    let resolver: jest.Mocked<Pick<CardImportResolver, 'resolveCard' | 'resolveFoil'>>;

    const mockRepo = {
        findByUser: jest.fn(),
        findOne: jest.fn(),
        findOneForUpdate: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        countByUser: jest.fn(),
    };
    const mockResolver = { resolveCard: jest.fn(), resolveFoil: jest.fn() };
    // Pass-through runner: execute the unit of work inline so assertions on
    // repository calls hold unchanged.
    const mockTxRunner = {
        run: jest.fn(<T>(work: () => Promise<T>) => work()),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BuyListService,
                { provide: BuyListRepositoryPort, useValue: mockRepo },
                { provide: CardImportResolver, useValue: mockResolver },
                { provide: TransactionRunnerPort, useValue: mockTxRunner },
            ],
        }).compile();
        service = module.get(BuyListService);
        repo = module.get(BuyListRepositoryPort);
        resolver = module.get(CardImportResolver);
    });

    describe('add', () => {
        it('increments the quantity', async () => {
            repo.increment.mockResolvedValue(3);
            await service.add(7, 'card-1', false, 2);
            expect(repo.increment).toHaveBeenCalledWith(7, 'card-1', false, 2);
        });

        it('is a no-op for quantity <= 0', async () => {
            await service.add(7, 'card-1', false, 0);
            expect(repo.increment).not.toHaveBeenCalled();
        });
    });

    describe('adjust', () => {
        it('uses the atomic increment for a positive delta', async () => {
            repo.increment.mockResolvedValue(5);

            const result = await service.adjust(7, 'card-1', false, 2);

            expect(result).toBe(5);
            expect(repo.increment).toHaveBeenCalledWith(7, 'card-1', false, 2);
            expect(mockTxRunner.run).not.toHaveBeenCalled();
        });

        it('decrements an existing item inside a transaction', async () => {
            repo.findOneForUpdate.mockResolvedValue({ quantity: 4 } as never);
            repo.save.mockResolvedValue({} as never);

            const result = await service.adjust(7, 'card-1', true, -1);

            expect(result).toBe(3);
            expect(mockTxRunner.run).toHaveBeenCalledTimes(1);
            expect(repo.findOneForUpdate).toHaveBeenCalledWith(7, 'card-1', true);
            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 7, cardId: 'card-1', isFoil: true, quantity: 3 })
            );
        });

        it('deletes the item when the result reaches 0', async () => {
            repo.findOneForUpdate.mockResolvedValue({ quantity: 2 } as never);

            const result = await service.adjust(7, 'card-1', false, -2);

            expect(result).toBe(0);
            expect(repo.delete).toHaveBeenCalledWith(7, 'card-1', false);
            expect(repo.save).not.toHaveBeenCalled();
        });

        it('clamps below 0 and does not delete a missing item', async () => {
            repo.findOneForUpdate.mockResolvedValue(null);

            const result = await service.adjust(7, 'card-1', false, -3);

            expect(result).toBe(0);
            expect(repo.delete).not.toHaveBeenCalled();
            expect(repo.save).not.toHaveBeenCalled();
        });
    });

    describe('setQuantity', () => {
        it('saves the absolute quantity when > 0', async () => {
            repo.save.mockResolvedValue({} as never);
            await service.setQuantity(7, 'card-1', true, 4);
            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 7, cardId: 'card-1', isFoil: true, quantity: 4 })
            );
            expect(repo.delete).not.toHaveBeenCalled();
        });

        it('deletes the item when quantity <= 0', async () => {
            await service.setQuantity(7, 'card-1', true, 0);
            expect(repo.delete).toHaveBeenCalledWith(7, 'card-1', true);
            expect(repo.save).not.toHaveBeenCalled();
        });
    });

    it('remove delegates to repo.delete', async () => {
        await service.remove(7, 'card-1', false);
        expect(repo.delete).toHaveBeenCalledWith(7, 'card-1', false);
    });

    it('list returns [] for a falsy user', async () => {
        const result = await service.list(0 as never);
        expect(result).toEqual([]);
        expect(repo.findByUser).not.toHaveBeenCalled();
    });

    describe('bulkAdd', () => {
        it('resolves each row and increments; reports unresolved rows', async () => {
            const card = makeCard();
            resolver.resolveCard
                .mockResolvedValueOnce({ card, error: null })
                .mockResolvedValueOnce({ card: null, error: 'Card not found' });
            resolver.resolveFoil.mockReturnValue(false);
            repo.increment.mockResolvedValue(1);

            const result = await service.bulkAdd(
                [{ name: 'Sol Ring', quantity: '2' }, { name: 'Nonexistent' }],
                7
            );

            expect(repo.increment).toHaveBeenCalledTimes(1);
            expect(repo.increment).toHaveBeenCalledWith(7, 'card-1', false, 2);
            expect(result.saved).toBe(1);
            // CSV row numbers (header = line 1): the 2nd data row is line 3.
            expect(result.errors).toEqual([
                { row: 3, name: 'Nonexistent', error: 'Card not found' },
            ]);
        });

        it('errors when the requested foil finish is unavailable', async () => {
            resolver.resolveCard.mockResolvedValue({ card: makeCard(), error: null });
            resolver.resolveFoil.mockReturnValue(null);

            const result = await service.bulkAdd([{ name: 'Sol Ring', foil: 'false' }], 7);

            expect(repo.increment).not.toHaveBeenCalled();
            expect(result.saved).toBe(0);
            expect(result.errors).toHaveLength(1);
        });

        it('defaults missing quantity to 1', async () => {
            resolver.resolveCard.mockResolvedValue({ card: makeCard(), error: null });
            resolver.resolveFoil.mockReturnValue(false);
            repo.increment.mockResolvedValue(1);

            await service.bulkAdd([{ name: 'Sol Ring' }], 7);

            expect(repo.increment).toHaveBeenCalledWith(7, 'card-1', false, 1);
        });
    });
});
