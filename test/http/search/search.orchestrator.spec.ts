import { Test, TestingModule } from '@nestjs/testing';
import { SearchQueryOptions } from 'src/core/query/search-query-options.dto';
import { SearchService } from 'src/core/search/search.service';
import { SearchOrchestrator } from 'src/http/hbs/search/search.orchestrator';

describe('SearchOrchestrator', () => {
    let orchestrator: SearchOrchestrator;
    let searchService: jest.Mocked<SearchService>;

    const mockOptions = new SearchQueryOptions({ page: '1', limit: '25' });
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
            isMain: true,
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
        isMain: true,
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
                        suggest: jest.fn(),
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
            const result = await orchestrator.search(mockReq, mockOptions);

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

            const optionsWithQ = new SearchQueryOptions({ page: '1', limit: '25', q: 'bolt' });
            const result = await orchestrator.search(mockReq, optionsWithQ);

            expect(searchService.search).toHaveBeenCalledWith('bolt', optionsWithQ);
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

            const optionsWithQ = new SearchQueryOptions({ page: '1', limit: '25', q: 'bolt' });
            const result = await orchestrator.search(mockReq, optionsWithQ);

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

            const optionsWithQ = new SearchQueryOptions({ page: '1', limit: '25', q: 'bolt' });
            const result = await orchestrator.search(authReq, optionsWithQ);

            expect(result.authenticated).toBe(true);
        });

        it('should build pagination with search term', async () => {
            searchService.search.mockResolvedValue({
                cards: [mockCard as any],
                cardTotal: 50,
                sets: [mockSet as any],
                setTotal: 5,
            });

            const optionsWithQ = new SearchQueryOptions({ page: '1', limit: '25', q: 'bolt' });
            const result = await orchestrator.search(mockReq, optionsWithQ);

            expect(result.cardPagination).toBeDefined();
            expect(result.cardPagination.totalPages).toBe(2);
            expect(result.setPagination).toBeDefined();
        });
    });

    describe('suggest', () => {
        it('should return empty response for short term', async () => {
            const result = await orchestrator.suggest('a');

            expect(searchService.suggest).not.toHaveBeenCalled();
            expect(result.cards).toEqual([]);
            expect(result.sets).toEqual([]);
        });

        it('should return empty response for empty term', async () => {
            const result = await orchestrator.suggest('');

            expect(searchService.suggest).not.toHaveBeenCalled();
            expect(result.cards).toEqual([]);
            expect(result.sets).toEqual([]);
        });

        it('should map cards and sets to suggest DTOs', async () => {
            searchService.suggest.mockResolvedValue({
                cards: [mockCard as any],
                sets: [mockSet as any],
            });

            const result = await orchestrator.suggest('bolt');

            expect(searchService.suggest).toHaveBeenCalledWith('bolt');
            expect(result.query).toBe('bolt');
            expect(result.cards).toHaveLength(1);
            expect(result.cards[0].name).toBe('Lightning Bolt');
            expect(result.cards[0].url).toBe('/card/lea/141');
            expect(result.cards[0].setCode).toBe('lea');
            expect(result.cards[0].keyruneCode).toBe('lea');
            expect(result.cards[0].rarity).toBe('common');
            expect(result.sets).toHaveLength(1);
            expect(result.sets[0].name).toBe('Limited Edition Alpha');
            expect(result.sets[0].url).toBe('/sets/lea');
            expect(result.sets[0].code).toBe('lea');
        });

        it('should return empty response on error', async () => {
            searchService.suggest.mockRejectedValue(new Error('Database error'));

            const result = await orchestrator.suggest('bolt');

            expect(result.cards).toEqual([]);
            expect(result.sets).toEqual([]);
            expect(result.query).toBe('bolt');
        });
    });
});
