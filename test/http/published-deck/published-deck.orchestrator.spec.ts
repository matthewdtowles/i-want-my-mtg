import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DomainNotFoundError } from 'src/core/errors/domain.errors';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckGapSummary } from 'src/core/deck/deck-gap.policy';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { PublishedDeck } from 'src/core/published-deck/published-deck.entity';
import { PublishedDeckService } from 'src/core/published-deck/published-deck.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PublishedDeckOrchestrator } from 'src/http/hbs/published-deck/published-deck.orchestrator';

describe('PublishedDeckOrchestrator', () => {
    let orchestrator: PublishedDeckOrchestrator;
    let publishedDeckService: jest.Mocked<PublishedDeckService>;
    let buildabilityService: jest.Mocked<DeckBuildabilityService>;
    let deckService: jest.Mocked<DeckService>;

    const authedReq = { user: { id: 1 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    const emptyGap: DeckGapSummary = {
        neededCount: 0,
        ownedCount: 0,
        missingCount: 0,
        completeness: 100,
        perCard: [],
        missingByCard: [],
    };

    function deckCard(over: Record<string, any> = {}): DeckCard {
        return new DeckCard({
            cardId: 'bolt',
            quantity: 4,
            isSideboard: false,
            card: {
                id: 'bolt',
                name: 'Lightning Bolt',
                setCode: 'LEA',
                number: '141',
                type: 'Instant',
                manaCost: '{R}',
                legalities: [],
                prices: [{ normal: 2.5, foil: null }],
            },
            ...over,
        } as Partial<DeckCard>);
    }

    function publishedDeck(over: Record<string, any> = {}): PublishedDeck {
        return new PublishedDeck({
            id: 1,
            source: 'fbettega',
            sourceUri: 'https://example.com/deck/1',
            tournamentName: 'RC Atlanta',
            tournamentDate: new Date('2026-02-10T00:00:00Z'),
            format: 'modern',
            archetype: 'Burn',
            player: 'Alice',
            result: '1st',
            cards: [deckCard()],
            ...over,
        } as Partial<PublishedDeck>);
    }

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublishedDeckOrchestrator,
                {
                    provide: PublishedDeckService,
                    useValue: { formats: jest.fn(), rowPage: jest.fn(), get: jest.fn() },
                },
                {
                    provide: DeckBuildabilityService,
                    useValue: { gapForDeck: jest.fn(), addMissingToBuyList: jest.fn() },
                },
                {
                    provide: DeckService,
                    useValue: { createDeck: jest.fn(), addCards: jest.fn() },
                },
            ],
        }).compile();

        orchestrator = module.get(PublishedDeckOrchestrator);
        publishedDeckService = module.get(PublishedDeckService);
        buildabilityService = module.get(DeckBuildabilityService);
        deckService = module.get(DeckService);
    });

    beforeEach(() => jest.clearAllMocks());

    describe('buildListView', () => {
        it('builds a row per primary format and hides the rest behind "view all"', async () => {
            publishedDeckService.formats.mockResolvedValue([
                'modern',
                'standard',
                'pauper',
                'vintage',
            ]);
            publishedDeckService.rowPage.mockResolvedValue({
                decks: [publishedDeck()],
                hasMore: true,
            });

            const view = await orchestrator.buildListView(anonReq);

            // Rows follow PRIMARY_FORMATS order, not the order the service returned.
            expect(view.rows.map((r) => r.format)).toEqual(['standard', 'modern']);
            expect(view.rows[0].label).toBe('Standard');
            expect(view.rows[0].nextOffset).toBe(1);
            expect(view.rows[0].hasMore).toBe(true);
            expect(view.hasDecks).toBe(true);
            expect(view.hasOtherFormats).toBe(true);
            expect(view.otherFormats).toEqual([
                { value: 'pauper', label: 'Pauper' },
                { value: 'vintage', label: 'Vintage' },
            ]);
            expect(view.indexable).toBe(true);
            expect(view.authenticated).toBe(false);
        });

        it('shows every present format as a row when none are primary', async () => {
            publishedDeckService.formats.mockResolvedValue(['pauper']);
            publishedDeckService.rowPage.mockResolvedValue({ decks: [], hasMore: false });

            const view = await orchestrator.buildListView(anonReq);

            expect(view.rows.map((r) => r.format)).toEqual(['pauper']);
            expect(view.hasOtherFormats).toBe(false);
        });

        it('sets hasDecks false when the catalog is empty', async () => {
            publishedDeckService.formats.mockResolvedValue([]);

            const view = await orchestrator.buildListView(anonReq);

            expect(view.hasDecks).toBe(false);
            expect(view.rows).toEqual([]);
        });

        it('maps a list item with its title, counts, and value', async () => {
            publishedDeckService.formats.mockResolvedValue(['modern']);
            publishedDeckService.rowPage.mockResolvedValue({
                decks: [publishedDeck()],
                hasMore: false,
            });

            const view = await orchestrator.buildListView(anonReq);

            expect(view.rows[0].decks[0]).toMatchObject({
                id: 1,
                title: 'Burn',
                formatLabel: 'Modern',
                tournamentName: 'RC Atlanta',
                date: '2/10/2026',
                result: '1st',
                cardCount: 4,
                estimatedValue: '$10.00',
                url: '/published-decks/1',
            });
        });
    });

    describe('buildRow', () => {
        it('pages with the requested offset and limit', async () => {
            publishedDeckService.rowPage.mockResolvedValue({
                decks: [publishedDeck()],
                hasMore: true,
            });

            const page = await orchestrator.buildRow('modern', 24, 10);

            expect(publishedDeckService.rowPage).toHaveBeenCalledWith('modern', 10, 24);
            expect(page.items).toHaveLength(1);
            expect(page.nextOffset).toBe(25);
            expect(page.hasMore).toBe(true);
        });

        it('returns an empty page when no format is given', async () => {
            const page = await orchestrator.buildRow(undefined, 0, 12);

            expect(page).toEqual({ items: [], nextOffset: 0, hasMore: false });
            expect(publishedDeckService.rowPage).not.toHaveBeenCalled();
        });

        it('clamps a negative offset and an oversized limit', async () => {
            publishedDeckService.rowPage.mockResolvedValue({ decks: [], hasMore: false });

            await orchestrator.buildRow('modern', -5, 1000);

            expect(publishedDeckService.rowPage).toHaveBeenCalledWith('modern', 48, 0);
        });

        it('falls back to the default row size for a non-numeric limit', async () => {
            publishedDeckService.rowPage.mockResolvedValue({ decks: [], hasMore: false });

            await orchestrator.buildRow('modern', NaN, NaN);

            expect(publishedDeckService.rowPage).toHaveBeenCalledWith('modern', 12, 0);
        });
    });

    describe('buildDetailView', () => {
        it('shows the gap for a signed-in user', async () => {
            publishedDeckService.get.mockResolvedValue(
                publishedDeck({
                    cards: [deckCard(), deckCard({ quantity: 1, isSideboard: true })],
                })
            );
            buildabilityService.gapForDeck.mockResolvedValue({
                ...emptyGap,
                neededCount: 4,
                ownedCount: 1,
                missingCount: 3,
                completeness: 25,
                perCard: [
                    {
                        cardId: 'bolt',
                        isSideboard: false,
                        need: 4,
                        owned: 1,
                        missing: 3,
                        isBasic: false,
                    },
                ],
            } as DeckGapSummary);

            const view = await orchestrator.buildDetailView(authedReq, 1);

            expect(buildabilityService.gapForDeck).toHaveBeenCalledWith(expect.any(Array), 1);
            expect(view.showGap).toBe(true);
            expect(view.completeness).toBe(25);
            expect(view.hasMissing).toBe(true);
            expect(view.deckTitle).toBe('Burn');
            expect(view.title).toBe('Burn - Tournament decks - I Want My MTG');
            expect(view.mainGroups[0].type).toBe('Instants');
            expect(view.mainGroups[0].cards[0]).toMatchObject({
                name: 'Lightning Bolt',
                url: '/card/lea/141',
                lineValue: '$10.00',
                owned: 1,
                missing: 3,
            });
            expect(view.sideboard).toHaveLength(1);
            expect(view.mainCount).toBe(4);
            expect(view.sideCount).toBe(1);
            expect(view.estimatedValue).toBe('$12.50');
        });

        it('skips the gap entirely for an anonymous visitor', async () => {
            publishedDeckService.get.mockResolvedValue(publishedDeck());

            const view = await orchestrator.buildDetailView(anonReq, 1);

            expect(buildabilityService.gapForDeck).not.toHaveBeenCalled();
            expect(view.showGap).toBe(false);
            expect(view.authenticated).toBe(false);
            expect(view.mainGroups[0].cards[0]).toMatchObject({ owned: 0, missing: 0 });
        });

        it('drops a non-http source URI so it cannot become a javascript: href', async () => {
            publishedDeckService.get.mockResolvedValue(
                publishedDeck({ sourceUri: 'javascript:alert(1)' })
            );

            const view = await orchestrator.buildDetailView(anonReq, 1);

            expect(view.sourceUri).toBe('');
        });

        it('drops an unparseable source URI', async () => {
            publishedDeckService.get.mockResolvedValue(publishedDeck({ sourceUri: 'not a url' }));

            const view = await orchestrator.buildDetailView(anonReq, 1);

            expect(view.sourceUri).toBe('');
        });

        it('falls back through archetype, player, then tournament name for the title', async () => {
            publishedDeckService.get.mockResolvedValue(
                publishedDeck({ archetype: null, player: null, format: null })
            );

            const view = await orchestrator.buildDetailView(anonReq, 1);

            expect(view.deckTitle).toBe('RC Atlanta');
            expect(view.formatLabel).toBe('Unknown format');
            expect(view.date).toBe('2/10/2026');
        });

        it('throws Not Found for an unknown deck', async () => {
            publishedDeckService.get.mockResolvedValue(null);

            await expect(orchestrator.buildDetailView(anonReq, 99)).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('cloneToUserDeck', () => {
        it('creates a deck titled after the source and copies every card', async () => {
            const source = publishedDeck({
                cards: [deckCard(), deckCard({ cardId: 'forest', quantity: 2, isSideboard: true })],
            });
            publishedDeckService.get.mockResolvedValue(source);
            deckService.createDeck.mockResolvedValue(new Deck({ id: 42, userId: 1, name: 'Burn' }));

            await expect(orchestrator.cloneToUserDeck(authedReq, 1)).resolves.toBe(42);
            expect(deckService.createDeck).toHaveBeenCalledWith(1, 'Burn');
            expect(deckService.addCards).toHaveBeenCalledWith(42, 1, [
                { cardId: 'bolt', isSideboard: false, quantity: 4 },
                { cardId: 'forest', isSideboard: true, quantity: 2 },
            ]);
        });

        // No try/catch here: the domain error escapes raw and the global
        // HttpExceptionFilter maps it to a 404.
        it('throws Not Found for an unknown deck', async () => {
            publishedDeckService.get.mockResolvedValue(null);

            await expect(orchestrator.cloneToUserDeck(authedReq, 99)).rejects.toThrow(
                DomainNotFoundError
            );
            expect(deckService.createDeck).not.toHaveBeenCalled();
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.cloneToUserDeck(anonReq, 1)).rejects.toThrow(
                UnauthorizedException
            );
            expect(publishedDeckService.get).not.toHaveBeenCalled();
        });
    });

    describe('addMissingToBuyList', () => {
        it('seeds the buy list from the deck cards and returns the count added', async () => {
            const deck = publishedDeck();
            publishedDeckService.get.mockResolvedValue(deck);
            buildabilityService.addMissingToBuyList.mockResolvedValue(3);

            await expect(orchestrator.addMissingToBuyList(authedReq, 1)).resolves.toBe(3);
            expect(buildabilityService.addMissingToBuyList).toHaveBeenCalledWith(deck.cards, 1);
        });

        it('throws Not Found for an unknown deck', async () => {
            publishedDeckService.get.mockResolvedValue(null);

            await expect(orchestrator.addMissingToBuyList(authedReq, 99)).rejects.toThrow(
                DomainNotFoundError
            );
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.addMissingToBuyList(anonReq, 1)).rejects.toThrow(
                UnauthorizedException
            );
        });
    });
});
