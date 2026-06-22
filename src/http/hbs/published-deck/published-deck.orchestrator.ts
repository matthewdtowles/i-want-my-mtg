import { Inject, Injectable } from '@nestjs/common';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckGapPolicy, DeckCardGap } from 'src/core/deck/deck-gap.policy';
import { DeckService } from 'src/core/deck/deck.service';
import { DeckSummaryPolicy } from 'src/core/deck/deck-summary.policy';
import { PublishedDeck } from 'src/core/published-deck/published-deck.entity';
import { PublishedDeckService } from 'src/core/published-deck/published-deck.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { buildCardUrl } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { primaryType, TYPE_ORDER, TYPE_PLURAL } from '../deck/deck-grouping';
import { deckColorPips, parseManaTokens } from '../deck/deck-mana';
import {
    PublishedDeckCardView,
    PublishedDeckDetailViewDto,
    PublishedDeckGroupView,
    PublishedDeckListItemView,
    PublishedDeckListViewDto,
    PublishedDeckRowPage,
    PublishedDeckRowView,
} from './dto/published-deck.view.dto';

// Formats shown as their own row by default, in this order. Any other format
// present in the catalog is revealed by the "View all formats" control.
const PRIMARY_FORMATS = ['standard', 'pioneer', 'modern', 'legacy', 'commander'];
// Decks loaded per row initially and per AJAX side-scroll batch.
const ROW_SIZE = 12;
const MAX_ROW_LIMIT = 48;

@Injectable()
export class PublishedDeckOrchestrator {
    private readonly LOGGER = getLogger(PublishedDeckOrchestrator.name);

    private static readonly CURRENCY = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    constructor(
        @Inject(PublishedDeckService) private readonly publishedDeckService: PublishedDeckService,
        @Inject(DeckBuildabilityService)
        private readonly buildabilityService: DeckBuildabilityService,
        @Inject(DeckService) private readonly deckService: DeckService
    ) {}

    async buildListView(req: AuthenticatedRequest): Promise<PublishedDeckListViewDto> {
        try {
            const present = await this.publishedDeckService.formats();
            const presentSet = new Set(present);
            const primary = PRIMARY_FORMATS.filter((f) => presentSet.has(f));
            // If none of the primary formats are present (e.g. only Pauper),
            // show every present format as a row so the page isn't blank behind
            // a "View all formats" button.
            const rowFormats = primary.length > 0 ? primary : present;

            const rows: PublishedDeckRowView[] = await Promise.all(
                rowFormats.map(async (format) => {
                    const { decks, hasMore } = await this.publishedDeckService.rowPage(
                        format,
                        ROW_SIZE,
                        0
                    );
                    return {
                        format,
                        label: this.capitalize(format),
                        decks: decks.map((d) => this.toListItem(d)),
                        nextOffset: decks.length,
                        hasMore,
                    };
                })
            );

            // Only the formats not already shown as rows go behind "View all".
            const others =
                primary.length > 0 ? present.filter((f) => !PRIMARY_FORMATS.includes(f)) : [];
            return new PublishedDeckListViewDto({
                authenticated: !!req.user,
                indexable: true,
                title: 'Tournament decks - I Want My MTG',
                metaDescription:
                    'Browse published tournament decklists by format and see which ones you can build from your collection.',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Tournament decks', url: '/published-decks' },
                ],
                rows,
                hasDecks: present.length > 0,
                otherFormats: others.map((f) => ({ value: f, label: this.capitalize(f) })),
                hasOtherFormats: others.length > 0,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building published deck list: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }

    /** A batch of decks for one format's row (AJAX side-scroll / "view all"). */
    async buildRow(
        format: string | undefined,
        offset: number,
        limit: number
    ): Promise<PublishedDeckRowPage> {
        if (!format) {
            return { items: [], nextOffset: 0, hasMore: false };
        }
        const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
        const safeLimit =
            Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), MAX_ROW_LIMIT) : ROW_SIZE;
        const { decks, hasMore } = await this.publishedDeckService.rowPage(
            format,
            safeLimit,
            safeOffset
        );
        const items: PublishedDeckListItemView[] = decks.map((d) => this.toListItem(d));
        return { items, nextOffset: safeOffset + items.length, hasMore };
    }

    async buildDetailView(
        req: AuthenticatedRequest,
        id: number
    ): Promise<PublishedDeckDetailViewDto> {
        try {
            const deck = await this.publishedDeckService.get(id);
            if (!deck) {
                throw new Error(`Published deck ${id} not found.`);
            }
            const cards = deck.cards ?? [];
            const main = cards.filter((c) => !c.isSideboard);
            const side = cards.filter((c) => c.isSideboard);

            const userId = req.user?.id;
            const gap = userId
                ? await this.buildabilityService.gapForDeck(cards, userId)
                : null;
            const gapByRow = new Map<string, DeckCardGap>();
            for (const g of gap?.perCard ?? []) {
                gapByRow.set(`${g.cardId}|${g.isSideboard}`, g);
            }

            const title = this.deckTitle(deck);
            return new PublishedDeckDetailViewDto({
                authenticated: !!userId,
                indexable: true,
                title: `${title} - Tournament decks - I Want My MTG`,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Tournament decks', url: '/published-decks' },
                    { label: title, url: `/published-decks/${deck.id}` },
                ],
                deckId: deck.id!,
                deckTitle: title,
                deckColors: deckColorPips(cards),
                tournamentName: deck.tournamentName ?? '',
                date: this.formatDate(deck.tournamentDate),
                formatLabel: deck.format ? this.capitalize(deck.format) : 'Unknown format',
                player: deck.player ?? '',
                result: deck.result ?? '',
                sourceUri: this.safeExternalUrl(deck.sourceUri),
                mainGroups: this.groupByType(main, gapByRow),
                sideboard: side.map((c) => this.toCardView(c, gapByRow)),
                mainCount: DeckSummaryPolicy.cardCount(main),
                sideCount: DeckSummaryPolicy.cardCount(side),
                estimatedValue: this.formatCurrency(DeckSummaryPolicy.estimatedValue(cards)),
                hasCards: cards.length > 0,
                showGap: !!gap,
                completeness: gap?.completeness ?? 0,
                neededCount: gap?.neededCount ?? 0,
                ownedCount: gap?.ownedCount ?? 0,
                missingCount: gap?.missingCount ?? 0,
                hasMissing: (gap?.missingCount ?? 0) > 0,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building published deck detail: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildDetailView');
        }
    }

    /** Copy a published deck into the user's own decks; returns the new deck id. */
    async cloneToUserDeck(req: AuthenticatedRequest, id: number): Promise<number> {
        HttpErrorHandler.validateAuthenticatedRequest(req);
        const source = await this.publishedDeckService.get(id);
        if (!source) {
            throw new Error(`Published deck ${id} not found.`);
        }
        const deck = await this.deckService.createDeck(req.user.id, this.deckTitle(source));
        const entries = (source.cards ?? []).map((c) => ({
            cardId: c.cardId,
            isSideboard: c.isSideboard,
            quantity: c.quantity,
        }));
        await this.deckService.addCards(deck.id!, req.user.id, entries);
        return deck.id!;
    }

    /** Seed the user's buy-list with the cards they're missing for this deck. */
    async addMissingToBuyList(req: AuthenticatedRequest, id: number): Promise<number> {
        HttpErrorHandler.validateAuthenticatedRequest(req);
        const deck = await this.publishedDeckService.get(id);
        if (!deck) {
            throw new Error(`Published deck ${id} not found.`);
        }
        return this.buildabilityService.addMissingToBuyList(deck.cards ?? [], req.user.id);
    }

    private toListItem(deck: PublishedDeck) {
        const cards = deck.cards ?? [];
        return {
            id: deck.id!,
            title: this.deckTitle(deck),
            formatLabel: deck.format ? this.capitalize(deck.format) : 'Unknown',
            tournamentName: deck.tournamentName ?? '',
            date: this.formatDate(deck.tournamentDate),
            result: deck.result ?? '',
            cardCount: DeckSummaryPolicy.cardCount(cards),
            estimatedValue: this.formatCurrency(DeckSummaryPolicy.estimatedValue(cards)),
            url: `/published-decks/${deck.id}`,
            colors: deckColorPips(cards),
        };
    }

    private groupByType(
        cards: DeckCard[],
        gapByRow: Map<string, DeckCardGap>
    ): PublishedDeckGroupView[] {
        const buckets = new Map<string, PublishedDeckCardView[]>();
        for (const dc of cards) {
            const key = primaryType(dc.card?.type ?? '');
            const list = buckets.get(key) ?? [];
            list.push(this.toCardView(dc, gapByRow));
            buckets.set(key, list);
        }
        const order = [...TYPE_ORDER, 'Other'];
        return order
            .filter((t) => buckets.has(t))
            .map((t) => {
                const cardViews = buckets.get(t)!;
                return {
                    type: TYPE_PLURAL[t] ?? t,
                    count: cardViews.reduce((sum, c) => sum + c.quantity, 0),
                    cards: cardViews,
                };
            });
    }

    private toCardView(dc: DeckCard, gapByRow: Map<string, DeckCardGap>): PublishedDeckCardView {
        const card = dc.card;
        const unitValue = DeckSummaryPolicy.cardValue(card);
        const gap = gapByRow.get(`${dc.cardId}|${dc.isSideboard}`);
        return {
            name: card?.name ?? dc.cardId,
            url: card ? buildCardUrl(card.setCode, card.number) : '#',
            manaCost: parseManaTokens(card?.manaCost),
            oracleText: card?.oracleText,
            quantity: dc.quantity,
            lineValue: this.formatCurrency(dc.quantity * unitValue),
            owned: gap?.owned ?? 0,
            missing: gap?.missing ?? 0,
            isBasic: gap?.isBasic ?? DeckGapPolicy.isBasic(card?.type),
        };
    }

    private deckTitle(deck: PublishedDeck): string {
        return deck.archetype || deck.player || deck.tournamentName || 'Tournament deck';
    }

    /**
     * `sourceUri` comes from an external feed and is rendered into an href, so
     * only allow http(s) - a `javascript:` URL would survive Handlebars escaping
     * and execute on click. Anything else becomes '' (the view omits the link).
     */
    private safeExternalUrl(uri: string | null | undefined): string {
        if (!uri) return '';
        try {
            const parsed = new URL(uri);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? uri : '';
        } catch {
            return '';
        }
    }

    private formatDate(date?: Date | null): string {
        return date ? date.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '';
    }

    private capitalize(value: string): string {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }

    private formatCurrency(value: number): string {
        return PublishedDeckOrchestrator.CURRENCY.format(value || 0);
    }
}
