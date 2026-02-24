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
    const mockCreateSetDtos: Set[] = Array.from(
        { length: 3 },
        (_, i) =>
            new Set({
                baseSize: 3,
                block: 'Test Set',
                cards: [],
                code: setCodes[i],
                isMain: true,
                keyruneCode: 'set',
                name: 'Test Set' + i,
                parentCode: 'SET',
                releaseDate: '2022-01-01',
                totalSize: 3,
                type: 'expansion',
            })
    );
    const mockSets: Set[] = mockCreateSetDtos;

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10' });

    const mockSetRepository = {
        findByCode: jest.fn(),
        findAllSetsMeta: jest.fn(),
        findBlockGroupKeys: jest.fn(),
        findMultiSetBlockKeys: jest.fn(),
        findSetsByBlockKeys: jest.fn(),
        findSpoilerSets: jest.fn(),
        totalBlockGroups: jest.fn(),
        totalSets: jest.fn(),
        totalCards: jest.fn(),
        totalCardsInSet: jest.fn(),
        totalInSet: jest.fn(),
        totalValueForSet: jest.fn(),
        searchSets: jest.fn(),
        totalSearchSets: jest.fn(),
    };

    beforeAll(async () => {
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

    beforeEach(() => {
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

    describe('findBlockGroupKeys', () => {
        it('should return block group keys', async () => {
            repository.findBlockGroupKeys.mockResolvedValue(['SET', 'ETS']);

            const result = await service.findBlockGroupKeys(mockQueryOptions);

            expect(repository.findBlockGroupKeys).toHaveBeenCalledWith(mockQueryOptions);
            expect(result).toEqual(['SET', 'ETS']);
        });

        it('should return empty array when no block groups exist', async () => {
            repository.findBlockGroupKeys.mockResolvedValue([]);

            const result = await service.findBlockGroupKeys(mockQueryOptions);

            expect(result).toEqual([]);
        });
    });

    describe('totalBlockGroups', () => {
        it('should return total count of block groups', async () => {
            repository.totalBlockGroups.mockResolvedValue(5);

            const result = await service.totalBlockGroups(mockQueryOptions);

            expect(repository.totalBlockGroups).toHaveBeenCalledWith(mockQueryOptions);
            expect(result).toBe(5);
        });

        it('should return 0 when no block groups exist', async () => {
            repository.totalBlockGroups.mockResolvedValue(0);

            const result = await service.totalBlockGroups(mockQueryOptions);

            expect(result).toBe(0);
        });
    });

    describe('findSetsByBlockKeys', () => {
        it('should return sets for given block keys', async () => {
            repository.findSetsByBlockKeys.mockResolvedValue(mockSets);

            const result = await service.findSetsByBlockKeys(['SET'], mockQueryOptions);

            expect(repository.findSetsByBlockKeys).toHaveBeenCalledWith(['SET'], mockQueryOptions);
            expect(result).toEqual(mockSets);
        });

        it('should return empty array for empty block keys', async () => {
            repository.findSetsByBlockKeys.mockResolvedValue([]);

            const result = await service.findSetsByBlockKeys([], mockQueryOptions);

            expect(result).toEqual([]);
        });
    });

    describe('findMultiSetBlockKeys', () => {
        it('should return multi-set block keys', async () => {
            repository.findMultiSetBlockKeys.mockResolvedValue(['SET']);

            const result = await service.findMultiSetBlockKeys(['SET', 'ETS']);

            expect(repository.findMultiSetBlockKeys).toHaveBeenCalledWith(['SET', 'ETS']);
            expect(result).toEqual(['SET']);
        });

        it('should return empty array when no multi-set blocks', async () => {
            repository.findMultiSetBlockKeys.mockResolvedValue([]);

            const result = await service.findMultiSetBlockKeys(['SET']);

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

    describe('findSpoilerSets', () => {
        it('should return spoiler sets', async () => {
            repository.findSpoilerSets.mockResolvedValue(mockSets);

            const result = await service.findSpoilerSets();

            expect(repository.findSpoilerSets).toHaveBeenCalled();
            expect(result).toEqual(mockSets);
        });

        it('should return empty array when no spoiler sets exist', async () => {
            repository.findSpoilerSets.mockResolvedValue([]);

            const result = await service.findSpoilerSets();

            expect(result).toEqual([]);
        });
    });

    describe('searchSets', () => {
        it('should return matching sets', async () => {
            repository.searchSets.mockResolvedValue(mockSets);

            const result = await service.searchSets('Test', mockQueryOptions);

            expect(repository.searchSets).toHaveBeenCalledWith('Test', mockQueryOptions);
            expect(result).toEqual(mockSets);
        });

        it('should return empty array when no sets match', async () => {
            repository.searchSets.mockResolvedValue([]);

            const result = await service.searchSets('zzzzz', mockQueryOptions);

            expect(result).toEqual([]);
        });

        it('should throw error when repository fails', async () => {
            repository.searchSets.mockRejectedValue(new Error('Database error'));

            await expect(service.searchSets('Test', mockQueryOptions)).rejects.toThrow(
                'Error searching sets for "Test"'
            );
        });
    });

    describe('totalSearchSets', () => {
        it('should return total count of matching sets', async () => {
            repository.totalSearchSets.mockResolvedValue(3);

            const result = await service.totalSearchSets('Test');

            expect(repository.totalSearchSets).toHaveBeenCalledWith('Test');
            expect(result).toBe(3);
        });

        it('should return 0 when no sets match', async () => {
            repository.totalSearchSets.mockResolvedValue(0);

            const result = await service.totalSearchSets('zzzzz');

            expect(result).toBe(0);
        });

        it('should throw error when repository fails', async () => {
            repository.totalSearchSets.mockRejectedValue(new Error('Database error'));

            await expect(service.totalSearchSets('Test')).rejects.toThrow(
                'Error counting set search results for "Test"'
            );
        });
    });
});
