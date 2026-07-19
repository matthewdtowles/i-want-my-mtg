import {
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Format } from 'src/core/card/format.enum';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckGapSummary } from 'src/core/deck/deck-gap.policy';
import { DeckImportService } from 'src/core/deck/deck-import.service';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { DeckPageOrchestrator } from 'src/http/hbs/deck/deck-page.orchestrator';

describe('DeckPageOrchestrator', () => {
    let orchestrator: DeckPageOrchestrator;
    let deckService: jest.Mocked<DeckService>;
    let deckImportService: jest.Mocked<DeckImportService>;
    let buildabilityService: jest.Mocked<DeckBuildabilityService>;

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
            cardId: 'c1',
            quantity: 1,
            isSideboard: false,
            card: {
                id: 'c1',
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

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeckPageOrchestrator,
                {
                    provide: DeckService,
                    useValue: { listDecks: jest.fn(), getDeck: jest.fn() },
                },
                { provide: DeckImportService, useValue: { importDecklist: jest.fn() } },
                {
                    provide: DeckBuildabilityService,
                    useValue: { summariesForDecks: jest.fn(), gapForDeck: jest.fn() },
                },
            ],
        }).compile();

        orchestrator = module.get(DeckPageOrchestrator);
        deckService = module.get(DeckService);
        deckImportService = module.get(DeckImportService);
        buildabilityService = module.get(DeckBuildabilityService);
    });

    beforeEach(() => jest.clearAllMocks());

    describe('buildImportView', () => {
        it('offers every format plus a "No format" default selection', () => {
            const view = orchestrator.buildImportView(authedReq);

            expect(view.authenticated).toBe(true);
            expect(view.formatOptions).toHaveLength(Object.values(Format).length + 1);
            expect(view.formatOptions[0]).toEqual({
                value: '',
                label: 'No format',
                selected: true,
            });
            expect(view.formatOptions.filter((o) => o.selected)).toHaveLength(1);
        });

        it('is public, pointing an anonymous visitor at tournament decks', () => {
            const view = orchestrator.buildImportView(anonReq);

            expect(view.authenticated).toBe(false);
            expect(view.breadcrumbs[1]).toEqual({
                label: 'Tournament decks',
                url: '/published-decks',
            });
        });
    });

    describe('importDecklist', () => {
        it('passes a known format through and reports the import result', async () => {
            deckImportService.importDecklist.mockResolvedValue({
                deckId: 9,
                name: 'Burn',
                saved: 60,
                errors: [{ row: 3, name: 'Bogus Card', error: 'not found' }],
            } as any);

            const view = await orchestrator.importDecklist(authedReq, 'Burn', 'modern', '4 Bolt');

            expect(deckImportService.importDecklist).toHaveBeenCalledWith(
                1,
                'Burn',
                Format.Modern,
                '4 Bolt'
            );
            expect(view.deckId).toBe(9);
            expect(view.deckUrl).toBe('/decks/9');
            expect(view.saved).toBe(60);
            expect(view.errorCount).toBe(1);
            expect(view.errors).toEqual([{ row: 3, name: 'Bogus Card', error: 'not found' }]);
        });

        it('treats an unrecognized format as no format', async () => {
            deckImportService.importDecklist.mockResolvedValue({
                deckId: 1,
                name: 'D',
                saved: 0,
                errors: [],
            } as any);

            await orchestrator.importDecklist(authedReq, 'D', 'not-a-format', '');

            expect(deckImportService.importDecklist).toHaveBeenCalledWith(1, 'D', null, '');
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.importDecklist(anonReq, 'D', undefined, '')).rejects.toThrow(
                UnauthorizedException
            );
            expect(deckImportService.importDecklist).not.toHaveBeenCalled();
        });
    });

    describe('buildListView', () => {
        it('ranks the most-buildable deck first and marks it buildable', async () => {
            const decks = [
                new Deck({ id: 1, userId: 1, name: 'Half done', cards: [deckCard()] }),
                new Deck({
                    id: 2,
                    userId: 1,
                    name: 'Ready',
                    format: Format.Modern,
                    cards: [deckCard({ quantity: 4 })],
                    updatedAt: new Date('2026-01-15T00:00:00Z'),
                }),
            ];
            deckService.listDecks.mockResolvedValue(decks);
            buildabilityService.summariesForDecks.mockResolvedValue(
                new Map([
                    [1, { ...emptyGap, completeness: 40, missingCount: 3 }],
                    [2, { ...emptyGap, completeness: 100, missingCount: 0 }],
                ])
            );

            const view = await orchestrator.buildListView(authedReq);

            expect(view.hasDecks).toBe(true);
            expect(view.decks.map((d) => d.id)).toEqual([2, 1]);
            expect(view.decks[0]).toMatchObject({
                name: 'Ready',
                formatLabel: 'Modern',
                cardCount: 4,
                estimatedValue: '$10.00',
                url: '/decks/2',
                updatedAt: '1/15/2026',
                buildable: true,
            });
            expect(view.decks[1]).toMatchObject({
                formatLabel: 'No format',
                missingCount: 3,
                buildable: false,
            });
        });

        it('defaults completeness to zero for a deck with no gap summary', async () => {
            deckService.listDecks.mockResolvedValue([
                new Deck({ id: 1, userId: 1, name: 'Empty', cards: [] }),
            ]);
            buildabilityService.summariesForDecks.mockResolvedValue(new Map());

            const view = await orchestrator.buildListView(authedReq);

            expect(view.decks[0]).toMatchObject({
                completeness: 0,
                updatedAt: '',
                estimatedValue: '$0.00',
                // No cards, so nothing to build even though nothing is missing.
                buildable: false,
            });
        });

        it('sets hasDecks false when the user has none', async () => {
            deckService.listDecks.mockResolvedValue([]);
            buildabilityService.summariesForDecks.mockResolvedValue(new Map());

            const view = await orchestrator.buildListView(authedReq);

            expect(view.hasDecks).toBe(false);
            expect(view.decks).toEqual([]);
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.buildListView(anonReq)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('maps an unexpected service error to a 500', async () => {
            deckService.listDecks.mockRejectedValue(new Error('boom'));

            await expect(orchestrator.buildListView(authedReq)).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });

    describe('buildDetailView', () => {
        const bolt = deckCard({ cardId: 'bolt', quantity: 4 });
        const forest = deckCard({
            cardId: 'forest',
            quantity: 2,
            card: {
                id: 'forest',
                name: 'Forest',
                setCode: 'LEA',
                number: '294',
                type: 'Basic Land — Forest',
                legalities: [],
                prices: [],
            },
        });
        const sideBolt = deckCard({ cardId: 'bolt', quantity: 1, isSideboard: true });

        it('groups the maindeck by type, keeps the sideboard separate, and totals value', async () => {
            deckService.getDeck.mockResolvedValue(
                new Deck({
                    id: 5,
                    userId: 1,
                    name: 'Burn',
                    format: Format.Modern,
                    cards: [bolt, forest, sideBolt],
                })
            );
            buildabilityService.gapForDeck.mockResolvedValue({
                ...emptyGap,
                neededCount: 5,
                ownedCount: 3,
                missingCount: 2,
                completeness: 60,
                perCard: [
                    {
                        cardId: 'bolt',
                        isSideboard: false,
                        need: 4,
                        owned: 2,
                        missing: 2,
                        isBasic: false,
                    },
                    {
                        cardId: 'forest',
                        isSideboard: false,
                        need: 2,
                        owned: 2,
                        missing: 0,
                        isBasic: true,
                    },
                ],
            } as DeckGapSummary);

            const view = await orchestrator.buildDetailView(authedReq, 5);

            expect(deckService.getDeck).toHaveBeenCalledWith(5, 1);
            expect(view.title).toBe('Burn - Decks - I Want My MTG');
            expect(view.formatLabel).toBe('Modern');
            // TYPE_ORDER puts Instants ahead of Lands.
            expect(view.mainGroups.map((g) => g.type)).toEqual(['Instants', 'Lands']);
            expect(view.mainGroups[0].count).toBe(4);
            expect(view.mainGroups[0].cards[0]).toMatchObject({
                name: 'Lightning Bolt',
                url: '/card/lea/141',
                unitValue: 2.5,
                lineValue: '$10.00',
                owned: 2,
                missing: 2,
                isBasic: false,
            });
            expect(view.mainGroups[1].cards[0]).toMatchObject({ isBasic: true, missing: 0 });
            expect(view.sideboard).toHaveLength(1);
            expect(view.mainCount).toBe(6);
            expect(view.sideCount).toBe(1);
            expect(view.estimatedValue).toBe('$12.50');
            expect(view.hasMissing).toBe(true);
            expect(view.completeness).toBe(60);
        });

        it('counts cards illegal in the deck format', async () => {
            const illegal = deckCard({
                cardId: 'bolt',
                quantity: 1,
                card: {
                    id: 'bolt',
                    name: 'Lightning Bolt',
                    setCode: 'LEA',
                    number: '141',
                    type: 'Instant',
                    legalities: [{ format: Format.Standard, status: 'banned' }],
                    prices: [],
                },
            });
            deckService.getDeck.mockResolvedValue(
                new Deck({
                    id: 6,
                    userId: 1,
                    name: 'Std',
                    format: Format.Standard,
                    cards: [illegal],
                })
            );
            buildabilityService.gapForDeck.mockResolvedValue(emptyGap);

            const view = await orchestrator.buildDetailView(authedReq, 6);

            expect(view.illegalCount).toBe(1);
            expect(view.mainGroups[0].cards[0].illegal).toBe(true);
        });

        it('reports no illegal cards when the deck has no format', async () => {
            deckService.getDeck.mockResolvedValue(
                new Deck({ id: 7, userId: 1, name: 'Casual', cards: [bolt] })
            );
            buildabilityService.gapForDeck.mockResolvedValue(emptyGap);

            const view = await orchestrator.buildDetailView(authedReq, 7);

            expect(view.illegalCount).toBe(0);
            expect(view.formatLabel).toBe('No format');
            expect(view.format).toBeNull();
        });

        it('falls back to the deck card quantity when a row has no gap entry', async () => {
            deckService.getDeck.mockResolvedValue(
                new Deck({ id: 8, userId: 1, name: 'D', cards: [bolt] })
            );
            buildabilityService.gapForDeck.mockResolvedValue(emptyGap);

            const view = await orchestrator.buildDetailView(authedReq, 8);

            expect(view.mainGroups[0].cards[0]).toMatchObject({ owned: 4, missing: 0 });
        });

        it('throws Not Found when the deck does not exist for this user', async () => {
            deckService.getDeck.mockResolvedValue(null);

            await expect(orchestrator.buildDetailView(authedReq, 99)).rejects.toThrow(
                NotFoundException
            );
        });

        it('throws Unauthorized for an unauthenticated request', async () => {
            await expect(orchestrator.buildDetailView(anonReq, 1)).rejects.toThrow(
                UnauthorizedException
            );
            expect(deckService.getDeck).not.toHaveBeenCalled();
        });
    });
});
