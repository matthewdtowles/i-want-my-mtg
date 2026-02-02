import { Test, TestingModule } from '@nestjs/testing';
import { Set } from 'src/core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { SetService } from 'src/core/set/set.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

describe('SetService', () => {
    let service: SetService;
    let repository: jest.Mocked<SetRepositoryPort>;

    const mockSetCode: string = 'SET';
    const setCodes: string[] = ['SET', 'ETS', 'TES'];
    const mockCreateSetDtos: Set[] = Array.from({ length: 3 }, (_, i) => ({
        baseSize: 3,
        block: 'Test Set',
        code: setCodes[i],
        imgSrc: null,
        keyruneCode: 'set',
        name: 'Test Set' + i,
        parentCode: 'SET',
        releaseDate: '2022-01-01',
        totalSize: 3,
        type: 'expansion',
        url: 'sets/' + setCodes[i],
    }));
    const mockSets: Set[] = mockCreateSetDtos.map((dto, i) => ({
        ...dto,
        id: i + 1,
        setCode: dto.code,
        cards: [],
    }));

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10' });

    beforeEach(async () => {
        const mockSetRepository = {
            findByCode: jest.fn(),
            findAllSetsMeta: jest.fn(),
            totalSets: jest.fn(),
            totalCards: jest.fn(),
            totalCardsInSet: jest.fn(),
            totalInSet: jest.fn(),
            totalValueForSet: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService,
                {
                    provide: SetRepositoryPort,
                    useValue: mockSetRepository,
                },
            ],
        }).compile();

        service = module.get<SetService>(SetService);
        repository = module.get(SetRepositoryPort) as jest.Mocked<SetRepositoryPort>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByCode', () => {
        it('should find set with cards by given set code', async () => {
            repository.findByCode.mockResolvedValue(mockSets[0]);

            const foundSetWithCards: Set = await service.findByCode(mockSetCode);

            expect(repository.findByCode).toHaveBeenCalledTimes(1);
            expect(repository.findByCode).toHaveBeenCalledWith(mockSetCode);
            expect(foundSetWithCards.code).toBe(mockSetCode);
            expect(foundSetWithCards.cards).toBeDefined();
        });

        it('should return null when set not found', async () => {
            repository.findByCode.mockResolvedValue(null);

            const result = await service.findByCode('NONEXISTENT');

            expect(repository.findByCode).toHaveBeenCalledWith('NONEXISTENT');
            expect(result).toBeNull();
        });
    });

    describe('findSets', () => {
        it('should return all sets with metadata', async () => {
            repository.findAllSetsMeta.mockResolvedValue(mockSets);

            const result = await service.findSets(mockQueryOptions);

            expect(repository.findAllSetsMeta).toHaveBeenCalledWith(mockQueryOptions);
            expect(result).toEqual(mockSets);
            expect(result.length).toBe(3);
        });

        it('should return empty array when no sets exist', async () => {
            repository.findAllSetsMeta.mockResolvedValue([]);

            const result = await service.findSets(mockQueryOptions);

            expect(result).toEqual([]);
        });
    });

    describe('totalSetsCount', () => {
        it('should return total count of sets', async () => {
            repository.totalSets.mockResolvedValue(3);

            const result = await service.totalSetsCount(mockQueryOptions);

            expect(repository.totalSets).toHaveBeenCalledWith(mockQueryOptions);
            expect(result).toBe(3);
        });

        it('should return 0 when no sets exist', async () => {
            repository.totalSets.mockResolvedValue(0);

            const result = await service.totalSetsCount(mockQueryOptions);

            expect(result).toBe(0);
        });
    });

    describe('totalCardsInSet', () => {
        it('should return total count of cards in set', async () => {
            repository.totalInSet.mockResolvedValue(250);

            const result = await service.totalCardsInSet(mockSetCode, mockQueryOptions);

            expect(repository.totalInSet).toHaveBeenCalledWith(mockSetCode, mockQueryOptions);
            expect(result).toBe(250);
        });

        it('should return 0 for empty set', async () => {
            repository.totalInSet.mockResolvedValue(0);

            const result = await service.totalCardsInSet('EMPTY', mockQueryOptions);

            expect(result).toBe(0);
        });

        it('should throw error when repository fails', async () => {
            repository.totalInSet.mockRejectedValue(new Error('Database error'));

            await expect(service.totalCardsInSet(mockSetCode, mockQueryOptions)).rejects.toThrow(
                `Error counting cards in set ${mockSetCode}`
            );
        });
    });

    describe('totalValueForSet', () => {
        it('should return total value of cards in set without foil', async () => {
            repository.totalValueForSet.mockResolvedValue(1000);

            const result = await service.totalValueForSet(mockSetCode, false, mockQueryOptions);

            expect(repository.totalValueForSet).toHaveBeenCalledWith(
                mockSetCode,
                false,
                mockQueryOptions
            );
            expect(result).toBe(1000);
        });

        it('should return total value of cards in set with foil', async () => {
            repository.totalValueForSet.mockResolvedValue(1500);

            const result = await service.totalValueForSet(mockSetCode, true, mockQueryOptions);

            expect(repository.totalValueForSet).toHaveBeenCalledWith(
                mockSetCode,
                true,
                mockQueryOptions
            );
            expect(result).toBe(1500);
        });

        it('should return 0 when set has no value', async () => {
            repository.totalValueForSet.mockResolvedValue(0);

            const result = await service.totalValueForSet('EMPTY', false, mockQueryOptions);

            expect(result).toBe(0);
        });

        it('should throw error when repository fails (non-foil)', async () => {
            repository.totalValueForSet.mockRejectedValue(new Error('Database error'));

            await expect(
                service.totalValueForSet(mockSetCode, false, mockQueryOptions)
            ).rejects.toThrow(`Error getting total value of non-foil cards for set ${mockSetCode}`);
        });

        it('should throw error when repository fails (with foil)', async () => {
            repository.totalValueForSet.mockRejectedValue(new Error('Database error'));

            await expect(
                service.totalValueForSet(mockSetCode, true, mockQueryOptions)
            ).rejects.toThrow(`Error getting total value of cards for set ${mockSetCode}`);
        });
    });
});
