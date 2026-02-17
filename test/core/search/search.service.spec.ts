import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SearchService } from 'src/core/search/search.service';
import { SetService } from 'src/core/set/set.service';

describe('SearchService', () => {
    let service: SearchService;
    let cardService: jest.Mocked<CardService>;
    let setService: jest.Mocked<SetService>;

    const mockOptions = new SafeQueryOptions({ page: '1', limit: '25' });

    const mockCards = [
        {
            id: '1',
            name: 'Lightning Bolt',
            imgSrc: 'abc.jpg',
            legalities: [],
            number: '1',
            rarity: 'common',
            setCode: 'lea',
            sortNumber: '001',
            type: 'Instant',
        },
    ];

    const mockSets = [
        {
            code: 'lea',
            baseSize: 295,
            keyruneCode: 'lea',
            name: 'Limited Edition Alpha',
            releaseDate: '1993-08-05',
            totalSize: 295,
            type: 'core',
        },
    ];

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                {
                    provide: CardService,
                    useValue: {
                        searchByName: jest.fn(),
                        totalSearchByName: jest.fn(),
                    },
                },
                {
                    provide: SetService,
                    useValue: {
                        searchSets: jest.fn(),
                        totalSearchSets: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        cardService = module.get(CardService) as jest.Mocked<CardService>;
        setService = module.get(SetService) as jest.Mocked<SetService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('should search cards and sets in parallel', async () => {
            cardService.searchByName.mockResolvedValue(mockCards as any);
            cardService.totalSearchByName.mockResolvedValue(1);
            setService.searchSets.mockResolvedValue(mockSets as any);
            setService.totalSearchSets.mockResolvedValue(1);

            const result = await service.search('bolt', mockOptions);

            expect(cardService.searchByName).toHaveBeenCalledWith('bolt', mockOptions);
            expect(cardService.totalSearchByName).toHaveBeenCalledWith('bolt');
            expect(setService.searchSets).toHaveBeenCalledWith('bolt', mockOptions);
            expect(setService.totalSearchSets).toHaveBeenCalledWith('bolt');
            expect(result.cards).toHaveLength(1);
            expect(result.cardTotal).toBe(1);
            expect(result.sets).toHaveLength(1);
            expect(result.setTotal).toBe(1);
        });

        it('should return empty results when nothing matches', async () => {
            cardService.searchByName.mockResolvedValue([]);
            cardService.totalSearchByName.mockResolvedValue(0);
            setService.searchSets.mockResolvedValue([]);
            setService.totalSearchSets.mockResolvedValue(0);

            const result = await service.search('zzzzz', mockOptions);

            expect(result.cards).toHaveLength(0);
            expect(result.cardTotal).toBe(0);
            expect(result.sets).toHaveLength(0);
            expect(result.setTotal).toBe(0);
        });

        it('should propagate errors from card service', async () => {
            cardService.searchByName.mockRejectedValue(new Error('Database error'));
            cardService.totalSearchByName.mockResolvedValue(0);
            setService.searchSets.mockResolvedValue([]);
            setService.totalSearchSets.mockResolvedValue(0);

            await expect(service.search('bolt', mockOptions)).rejects.toThrow('Database error');
        });

        it('should propagate errors from set service', async () => {
            cardService.searchByName.mockResolvedValue([]);
            cardService.totalSearchByName.mockResolvedValue(0);
            setService.searchSets.mockRejectedValue(new Error('Set search error'));
            setService.totalSearchSets.mockResolvedValue(0);

            await expect(service.search('bolt', mockOptions)).rejects.toThrow('Set search error');
        });
    });
});
