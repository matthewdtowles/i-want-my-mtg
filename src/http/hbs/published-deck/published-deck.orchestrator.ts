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
import { deckColors } from '../deck/deck-mana';
import {
    PublishedDeckCardView,
    PublishedDeckDetailViewDto,
    PublishedDeckGroupView,
    PublishedDeckListViewDto,
    PublishedFormatOptionView,
} from './dto/published-deck.view.dto';

const PAGE_SIZE = 24;

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

    async buildListView(
        req: AuthenticatedRequest,
        format: string | undefined,
        page: number
    ): Promise<PublishedDeckListViewDto> {
        try {
            const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
            const offset = (safePage - 1) * PAGE_SIZE;
            const [{ decks, total }, formats] = await Promise.all([
                this.publishedDeckService.list(format, PAGE_SIZE, offset),
                this.publishedDeckService.formats(),
            ]);
            const baseUrl = format ? `/published-decks?format=${encodeURIComponent(format)}&` : '/published-decks?';
            return new PublishedDeckListViewDto({
                authenticated: !!req.user,
                indexable: true,
                title: 'Tournament decks - I Want My MTG',
                metaDescription:
                    'Browse published tournament decklists and see which ones you can build from your collection.',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Tournament decks', url: '/published-decks' },
                ],
                decks: decks.map((d) => this.toListItem(d)),
                hasDecks: decks.length > 0,
                formats: this.buildFormatOptions(formats, format),
                page: safePage,
                hasPrev: safePage > 1,
                hasNext: offset + decks.length < total,
                prevUrl: `${baseUrl}page=${safePage - 1}`,
                nextUrl: `${baseUrl}page=${safePage + 1}`,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building published deck list: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
        }
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
                deckColors: deckColors(cards),
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
            colors: deckColors(cards),
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
            imgSrc: card?.imgSrc ?? '',
            manaCost: card?.manaCost,
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

    private buildFormatOptions(
        formats: string[],
        selected: string | undefined
    ): PublishedFormatOptionView[] {
        const options: PublishedFormatOptionView[] = [
            { value: '', label: 'All formats', selected: !selected },
        ];
        for (const f of formats) {
            options.push({ value: f, label: this.capitalize(f), selected: f === selected });
        }
        return options;
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
