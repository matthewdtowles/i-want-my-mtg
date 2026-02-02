import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { CardService } from 'src/core/card/card.service';
import { Format } from 'src/core/card/format.enum';
import { Legality } from 'src/core/card/legality.entity';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

describe('CardService', () => {
    let service: CardService;
    let repository: jest.Mocked<CardRepositoryPort>;

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10' });

    const testCard = new Card({
        id: 'test-card-id',
        name: 'Test Card',
        setCode: 'TST',
        number: '123',
        rarity: CardRarity.Common,
        imgSrc: 'test-image.jpg',
        inMain: true,
        isReserved: false,
        hasFoil: true,
        hasNonFoil: true,
        sortNumber: '000123',
        type: 'Creature',
        legalities: [
            new Legality({
                format: Format.Standard,
                status: LegalityStatus.Legal,
                cardId: 'test-card-id',
            }),
            new Legality({
                format: Format.Modern,
                status: LegalityStatus.Legal,
                cardId: 'test-card-id',
            }),
            new Legality({
                format: Format.Pauper,
                status: LegalityStatus.Legal,
                cardId: 'test-card-id',
            }),
            new Legality({
                format: Format.Legacy,
                status: LegalityStatus.Legal,
                cardId: 'test-card-id',
            }),
        ],
    });

    beforeEach(async () => {
        const mockRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            deleteLegality: jest.fn(),
            findByIds: jest.fn(),
            findAllInSet: jest.fn(),
            findWithName: jest.fn(),
            findBySetCodeAndNumber: jest.fn(),
            findBySet: jest.fn(),
            totalWithName: jest.fn(),
            totalInSet: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [CardService, { provide: CardRepositoryPort, useValue: mockRepository }],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get(CardRepositoryPort) as jest.Mocked<CardRepositoryPort>;
    });

    describe('findWithName', () => {
        it('should return cards with the given name', async () => {
            const cards = [testCard];
            repository.findWithName.mockResolvedValue(cards);

            const result = await service.findWithName('Test Card', mockQueryOptions);

            expect(repository.findWithName).toHaveBeenCalledWith('Test Card', mockQueryOptions);
            expect(result).toEqual(cards);
        });

        it('should throw error when repository fails', async () => {
            repository.findWithName.mockRejectedValue(new Error('Database error'));

            await expect(service.findWithName('Test Card', mockQueryOptions)).rejects.toThrow(
                'Error finding cards with name Test Card'
            );
        });
    });

    describe('findBySet', () => {
        it('should return cards in the given set', async () => {
            const cards = [testCard];
            repository.findBySet.mockResolvedValue(cards);

            const result = await service.findBySet('TST', mockQueryOptions);

            expect(repository.findBySet).toHaveBeenCalledWith('TST', mockQueryOptions);
            expect(result).toEqual(cards);
        });

        it('should return empty array when no cards in set', async () => {
            repository.findBySet.mockResolvedValue([]);

            const result = await service.findBySet('EMPTY', mockQueryOptions);

            expect(repository.findBySet).toHaveBeenCalledWith('EMPTY', mockQueryOptions);
            expect(result).toEqual([]);
        });

        it('should throw error when repository fails', async () => {
            repository.findBySet.mockRejectedValue(new Error('Database error'));

            await expect(service.findBySet('TST', mockQueryOptions)).rejects.toThrow(
                'Error finding cards in set TST'
            );
        });
    });

    describe('findBySetCodeAndNumber', () => {
        it('should return card when found', async () => {
            repository.findBySetCodeAndNumber.mockResolvedValue(testCard);

            const result = await service.findBySetCodeAndNumber('TST', '123');

            expect(repository.findBySetCodeAndNumber).toHaveBeenCalledWith('TST', '123', [
                'set',
                'legalities',
                'prices',
            ]);
            expect(result).toEqual(testCard);
        });

        it('should return null when card not found', async () => {
            repository.findBySetCodeAndNumber.mockResolvedValue(null);

            const result = await service.findBySetCodeAndNumber('TST', '999');

            expect(repository.findBySetCodeAndNumber).toHaveBeenCalledWith('TST', '999', [
                'set',
                'legalities',
                'prices',
            ]);
            expect(result).toBeNull();
        });

        it('should throw error when repository fails', async () => {
            repository.findBySetCodeAndNumber.mockRejectedValue(new Error('Database error'));

            await expect(service.findBySetCodeAndNumber('TST', '123')).rejects.toThrow(
                'Error finding card with set code TST and number 123'
            );
        });
    });

    describe('totalWithName', () => {
        it('should return total count of cards with name', async () => {
            repository.totalWithName.mockResolvedValue(5);

            const result = await service.totalWithName('Test Card');

            expect(repository.totalWithName).toHaveBeenCalledWith('Test Card');
            expect(result).toBe(5);
        });

        it('should return 0 when no cards found', async () => {
            repository.totalWithName.mockResolvedValue(0);

            const result = await service.totalWithName('Nonexistent');

            expect(result).toBe(0);
        });

        it('should throw error when repository fails', async () => {
            repository.totalWithName.mockRejectedValue(new Error('Database error'));

            await expect(service.totalWithName('Test Card')).rejects.toThrow(
                'Error counting cards with name Test Card'
            );
        });
    });

    describe('totalInSet', () => {
        it('should return total count of cards in set', async () => {
            repository.totalInSet.mockResolvedValue(250);

            const result = await service.totalInSet('TST', mockQueryOptions);

            expect(repository.totalInSet).toHaveBeenCalledWith('TST', mockQueryOptions);
            expect(result).toBe(250);
        });

        it('should return 0 for empty set', async () => {
            repository.totalInSet.mockResolvedValue(0);

            const result = await service.totalInSet('EMPTY', mockQueryOptions);

            expect(result).toBe(0);
        });

        it('should throw error when repository fails', async () => {
            repository.totalInSet.mockRejectedValue(new Error('Database error'));

            await expect(service.totalInSet('TST', mockQueryOptions)).rejects.toThrow(
                'Error counting cards in set TST'
            );
        });
    });
});
