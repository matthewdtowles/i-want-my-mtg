import { Test, TestingModule } from '@nestjs/testing';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SearchService } from 'src/core/search/search.service';
import { SearchOrchestrator } from 'src/http/search/search.orchestrator';

describe('SearchOrchestrator', () => {
    let orchestrator: SearchOrchestrator;
    let searchService: jest.Mocked<SearchService>;

    const mockOptions = new SafeQueryOptions({ page: '1', limit: '25' });
    const mockReq: any = { user: null, isAuthenticated: () => false };

    const mockCard = {
        id: '1',
        name: 'Lightning Bolt',
        imgSrc: 'abc.jpg',
        legalities: [],
        number: '141',
        rarity: 'common',
        setCode: 'lea',
        sortNumber: '141',
        type: 'Instant',
        set: {
            code: 'lea',
            baseSize: 295,
            keyruneCode: 'lea',
            name: 'Limited Edition Alpha',
            releaseDate: '1993-08-05',
            totalSize: 295,
            type: 'core',
        },
    };

    const mockSet = {
        code: 'lea',
        baseSize: 295,
        keyruneCode: 'lea',
        name: 'Limited Edition Alpha',
        releaseDate: '1993-08-05',
        totalSize: 295,
        type: 'core',
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchOrchestrator,
                {
                    provide: SearchService,
                    useValue: {
                        search: jest.fn(),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get<SearchOrchestrator>(SearchOrchestrator);
        searchService = module.get(SearchService) as jest.Mocked<SearchService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('should return empty view when no term provided', async () => {
            const result = await orchestrator.search(mockReq, undefined, mockOptions);

            expect(searchService.search).not.toHaveBeenCalled();
            expect(result.query).toBe('');
            expect(result.cards).toEqual([]);
            expect(result.sets).toEqual([]);
        });

        it('should return search results with mapped DTOs', async () => {
            searchService.search.mockResolvedValue({
                cards: [mockCard as any],
                cardTotal: 1,
                sets: [mockSet as any],
                setTotal: 1,
            });

            const result = await orchestrator.search(mockReq, 'bolt', mockOptions);

            expect(searchService.search).toHaveBeenCalledWith('bolt', mockOptions);
            expect(result.query).toBe('bolt');
            expect(result.cards).toHaveLength(1);
            expect(result.cards[0].name).toBe('Lightning Bolt');
            expect(result.cards[0].url).toBe('/card/lea/141');
            expect(result.cards[0].setCode).toBe('lea');
            expect(result.sets).toHaveLength(1);
            expect(result.sets[0].name).toBe('Limited Edition Alpha');
            expect(result.sets[0].url).toBe('/sets/lea');
            expect(result.cardTotal).toBe(1);
            expect(result.setTotal).toBe(1);
        });

        it('should include breadcrumbs', async () => {
            searchService.search.mockResolvedValue({
                cards: [],
                cardTotal: 0,
                sets: [],
                setTotal: 0,
            });

            const result = await orchestrator.search(mockReq, 'bolt', mockOptions);

            expect(result.breadcrumbs).toEqual([
                { label: 'Home', url: '/' },
                { label: 'Search', url: '/search' },
            ]);
        });

        it('should set authenticated from request', async () => {
            const authReq: any = {
                user: { id: 1, email: 'test@test.com' },
                isAuthenticated: () => true,
            };
            searchService.search.mockResolvedValue({
                cards: [],
                cardTotal: 0,
                sets: [],
                setTotal: 0,
            });

            const result = await orchestrator.search(authReq, 'bolt', mockOptions);

            expect(result.authenticated).toBe(true);
        });

        it('should build pagination with search term in extras', async () => {
            searchService.search.mockResolvedValue({
                cards: [mockCard as any],
                cardTotal: 50,
                sets: [mockSet as any],
                setTotal: 5,
            });

            const result = await orchestrator.search(mockReq, 'bolt', mockOptions);

            expect(result.cardPagination).toBeDefined();
            expect(result.cardPagination.totalPages).toBe(2);
            expect(result.setPagination).toBeDefined();
        });
    });
});
