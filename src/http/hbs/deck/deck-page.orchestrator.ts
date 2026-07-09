import { Inject, Injectable } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckCardGap, DeckGapSummary } from 'src/core/deck/deck-gap.policy';
import { DeckImportService } from 'src/core/deck/deck-import.service';
import { DeckLegalityPolicy } from 'src/core/deck/deck-legality.policy';
import { DeckSummaryPolicy } from 'src/core/deck/deck-summary.policy';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { buildCardUrl } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { primaryType, TYPE_ORDER, TYPE_PLURAL } from './deck-grouping';
import { deckColorPips, parseManaTokens } from './deck-mana';
import {
    DeckCardGroupView,
    DeckCardView,
    DeckDetailViewDto,
    DeckImportResultViewDto,
    DeckImportViewDto,
    DeckListViewDto,
    FormatOptionView,
} from './dto/deck.view.dto';

@Injectable()
export class DeckPageOrchestrator {
    private readonly LOGGER = getLogger(DeckPageOrchestrator.name);

    private static readonly CURRENCY = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    constructor(
        @Inject(DeckService) private readonly deckService: DeckService,
        @Inject(DeckImportService) private readonly deckImportService: DeckImportService,
        @Inject(DeckBuildabilityService)
        private readonly buildabilityService: DeckBuildabilityService
    ) {}

    buildImportView(req: AuthenticatedRequest): DeckImportViewDto {
        // Public: anyone can load the build form. Saving (POST) still requires
        // auth; an anonymous user is bounced to login and their work preserved.
        const authenticated = !!req.user;
        return new DeckImportViewDto({
            authenticated,
            title: 'Build a deck - I Want My MTG',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                authenticated
                    ? { label: 'Decks', url: '/decks' }
                    : { label: 'Tournament decks', url: '/published-decks' },
                { label: 'Build', url: '/decks/import' },
            ],
            formatOptions: this.buildFormatOptions(null),
        });
    }

    async importDecklist(
        req: AuthenticatedRequest,
        name: string,
        format: string | undefined,
        text: string
    ): Promise<DeckImportResultViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const fmt = Object.values(Format).includes(format as Format)
                ? (format as Format)
                : null;
            const result = await this.deckImportService.importDecklist(
                req.user.id,
                name,
                fmt,
                text
            );
            return new DeckImportResultViewDto({
                authenticated: true,
                title: 'Import complete - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Decks', url: '/decks' },
                    { label: result.name, url: `/decks/${result.deckId}` },
                ],
                deckId: result.deckId,
                deckName: result.name,
                deckUrl: `/decks/${result.deckId}`,
                saved: result.saved,
                errorCount: result.errors.length,
                errors: result.errors.map((e) => ({
                    row: e.row,
                    name: typeof e.name === 'string' ? e.name : undefined,
                    error: e.error,
                })),
            });
        } catch (error) {
            this.LOGGER.debug(`Error importing decklist: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'importDecklist');
        }
    }

    async buildListView(req: AuthenticatedRequest): Promise<DeckListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const decks = await this.deckService.listDecks(req.user.id);
            const summaries = await this.buildabilityService.summariesForDecks(decks, req.user.id);
            // Rank most-buildable first, then fall back to recency (load order).
            const items = decks
                .map((d) => this.toListItem(d, summaries.get(d.id!)))
                .sort((a, b) => b.completeness - a.completeness);
            return new DeckListViewDto({
                authenticated: true,
                title: 'Decks - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Decks', url: '/decks' },
                ],
                hasDecks: decks.length > 0,
                decks: items,
                formatOptions: this.buildFormatOptions(null),
            });
        } catch (error) {
            this.LOGGER.debug(`Error building deck list view: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }

    async buildDetailView(req: AuthenticatedRequest, deckId: number): Promise<DeckDetailViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const deck = await this.deckService.getDeck(deckId, req.user.id);
            if (!deck) {
                throw new Error(`Deck ${deckId} not found.`);
            }
            const cards = deck.cards ?? [];
            const main = cards.filter((c) => !c.isSideboard);
            const side = cards.filter((c) => c.isSideboard);
            const illegalCount = deck.format
                ? cards.filter((c) => this.isIllegal(deck.format, c)).length
                : 0;

            const gap = await this.buildabilityService.gapForDeck(cards, req.user.id);
            const gapByRow = new Map<string, DeckCardGap>();
            for (const g of gap.perCard) {
                gapByRow.set(`${g.cardId}|${g.isSideboard}`, g);
            }

            return new DeckDetailViewDto({
                authenticated: true,
                title: `${deck.name} - Decks - I Want My MTG`,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Decks', url: '/decks' },
                    { label: deck.name, url: `/decks/${deck.id}` },
                ],
                deckId: deck.id!,
                name: deck.name,
                format: deck.format ?? null,
                formatLabel: deck.format ? this.capitalize(deck.format) : 'No format',
                formatOptions: this.buildFormatOptions(deck.format ?? null),
                mainGroups: this.groupByType(main, deck.format ?? null, gapByRow),
                sideboard: side.map((c) => this.toCardView(c, deck.format ?? null, gapByRow)),
                deckColors: deckColorPips(cards),
                mainCount: DeckSummaryPolicy.cardCount(main),
                sideCount: DeckSummaryPolicy.cardCount(side),
                estimatedValue: this.formatCurrency(DeckSummaryPolicy.estimatedValue(cards)),
                illegalCount,
                hasCards: cards.length > 0,
                completeness: gap.completeness,
                neededCount: gap.neededCount,
                ownedCount: gap.ownedCount,
                missingCount: gap.missingCount,
                hasMissing: gap.missingCount > 0,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building deck detail view: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'buildDetailView');
        }
    }

    private toListItem(deck: Deck, gap?: DeckGapSummary) {
        const cards = deck.cards ?? [];
        return {
            id: deck.id!,
            name: deck.name,
            formatLabel: deck.format ? this.capitalize(deck.format) : 'No format',
            cardCount: DeckSummaryPolicy.cardCount(cards),
            estimatedValue: this.formatCurrency(DeckSummaryPolicy.estimatedValue(cards)),
            updatedAt: deck.updatedAt
                ? deck.updatedAt.toLocaleDateString('en-US', { timeZone: 'UTC' })
                : '',
            url: `/decks/${deck.id}`,
            colors: deckColorPips(cards),
            completeness: gap?.completeness ?? 0,
            missingCount: gap?.missingCount ?? 0,
            buildable: (gap?.missingCount ?? 0) === 0 && cards.length > 0,
        };
    }

    private groupByType(
        cards: DeckCard[],
        format: Format | null,
        gapByRow: Map<string, DeckCardGap>
    ): DeckCardGroupView[] {
        const buckets = new Map<string, DeckCardView[]>();
        for (const dc of cards) {
            const key = primaryType(dc.card?.type ?? '');
            const list = buckets.get(key) ?? [];
            list.push(this.toCardView(dc, format, gapByRow));
            buckets.set(key, list);
        }
        const order = [...TYPE_ORDER, 'Other'];
        return order
            .filter((t) => buckets.has(t))
            .map((t) => {
                const cardViews = buckets.get(t)!;
                return {
                    type: TYPE_PLURAL[t] ?? t,
                    groupKey: t,
                    count: cardViews.reduce((sum, c) => sum + c.quantity, 0),
                    cards: cardViews,
                };
            });
    }

    private toCardView(
        dc: DeckCard,
        format: Format | null,
        gapByRow: Map<string, DeckCardGap>
    ): DeckCardView {
        const card = dc.card;
        const unitValue = DeckSummaryPolicy.cardValue(card);
        const gap = gapByRow.get(`${dc.cardId}|${dc.isSideboard}`);
        return {
            cardId: dc.cardId,
            name: card?.name ?? dc.cardId,
            setCode: card?.setCode ?? '',
            number: card?.number ?? '',
            url: card ? buildCardUrl(card.setCode, card.number) : '#',
            manaCost: parseManaTokens(card?.manaCost),
            oracleText: card?.oracleText,
            quantity: dc.quantity,
            // Full precision; deckDetail.js rounds at display so client-recomputed
            // totals match the server's multiply-then-round lineValue/estimatedValue.
            unitValue,
            lineValue: this.formatCurrency(dc.quantity * unitValue),
            isSideboard: dc.isSideboard,
            illegal: this.isIllegal(format, dc),
            owned: gap?.owned ?? dc.quantity,
            missing: gap?.missing ?? 0,
            isBasic: gap?.isBasic ?? false,
        };
    }

    private isIllegal(format: Format | null, dc: DeckCard): boolean {
        return !!format && !DeckLegalityPolicy.isCardLegal(format, dc.card?.legalities);
    }

    private buildFormatOptions(selected: string | null): FormatOptionView[] {
        const options: FormatOptionView[] = [
            { value: '', label: 'No format', selected: !selected },
        ];
        for (const f of Object.values(Format)) {
            options.push({ value: f, label: this.capitalize(f), selected: f === selected });
        }
        return options;
    }

    private capitalize(value: string): string {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }

    private formatCurrency(value: number): string {
        return DeckPageOrchestrator.CURRENCY.format(value || 0);
    }
}
