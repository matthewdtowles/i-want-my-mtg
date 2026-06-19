import { Inject, Injectable } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckLegalityPolicy } from 'src/core/deck/deck-legality.policy';
import { DeckSummaryPolicy } from 'src/core/deck/deck-summary.policy';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { buildCardUrl } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import {
    DeckCardGroupView,
    DeckCardView,
    DeckDetailViewDto,
    DeckListViewDto,
    FormatOptionView,
} from './dto/deck.view.dto';

// Maindeck grouping: pick a card's primary type, in deckbuilder display order.
const TYPE_ORDER = [
    'Creature',
    'Planeswalker',
    'Instant',
    'Sorcery',
    'Artifact',
    'Enchantment',
    'Battle',
    'Land',
];
const TYPE_PLURAL: Record<string, string> = {
    Creature: 'Creatures',
    Planeswalker: 'Planeswalkers',
    Instant: 'Instants',
    Sorcery: 'Sorceries',
    Artifact: 'Artifacts',
    Enchantment: 'Enchantments',
    Battle: 'Battles',
    Land: 'Lands',
    Other: 'Other',
};

@Injectable()
export class DeckPageOrchestrator {
    private readonly LOGGER = getLogger(DeckPageOrchestrator.name);

    private static readonly CURRENCY = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    constructor(@Inject(DeckService) private readonly deckService: DeckService) {}

    async buildListView(req: AuthenticatedRequest): Promise<DeckListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const decks = await this.deckService.listDecks(req.user.id);
            return new DeckListViewDto({
                authenticated: true,
                title: 'Decks - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Decks', url: '/decks' },
                ],
                hasDecks: decks.length > 0,
                decks: decks.map((d) => this.toListItem(d)),
                formatOptions: this.buildFormatOptions(null),
            });
        } catch (error) {
            this.LOGGER.debug(`Error building deck list view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
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
                mainGroups: this.groupByType(main, deck.format ?? null),
                sideboard: side.map((c) => this.toCardView(c, deck.format ?? null)),
                mainCount: DeckSummaryPolicy.cardCount(main),
                sideCount: DeckSummaryPolicy.cardCount(side),
                estimatedValue: this.formatCurrency(DeckSummaryPolicy.estimatedValue(cards)),
                illegalCount,
                hasCards: cards.length > 0,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building deck detail view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildDetailView');
        }
    }

    private toListItem(deck: Deck) {
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
        };
    }

    private groupByType(cards: DeckCard[], format: Format | null): DeckCardGroupView[] {
        const buckets = new Map<string, DeckCardView[]>();
        for (const dc of cards) {
            const key = this.primaryType(dc.card?.type ?? '');
            const list = buckets.get(key) ?? [];
            list.push(this.toCardView(dc, format));
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

    private toCardView(dc: DeckCard, format: Format | null): DeckCardView {
        const card = dc.card;
        const unitValue = DeckSummaryPolicy.cardValue(card);
        return {
            cardId: dc.cardId,
            name: card?.name ?? dc.cardId,
            setCode: card?.setCode ?? '',
            number: card?.number ?? '',
            url: card ? buildCardUrl(card.setCode, card.number) : '#',
            imgSrc: card?.imgSrc ?? '',
            manaCost: card?.manaCost,
            quantity: dc.quantity,
            // Full precision; deckDetail.js rounds at display so client-recomputed
            // totals match the server's multiply-then-round lineValue/estimatedValue.
            unitValue,
            lineValue: this.formatCurrency(dc.quantity * unitValue),
            isSideboard: dc.isSideboard,
            illegal: this.isIllegal(format, dc),
        };
    }

    private isIllegal(format: Format | null, dc: DeckCard): boolean {
        return !!format && !DeckLegalityPolicy.isCardLegal(format, dc.card?.legalities);
    }

    private primaryType(typeLine: string): string {
        // MTGJSON type lines use an em dash (U+2014) before subtypes, e.g.
        // "Legendary Creature [em dash] God"; take the part before it.
        const head = (typeLine ?? '').split(String.fromCharCode(0x2014))[0];
        return TYPE_ORDER.find((t) => head.includes(t)) ?? 'Other';
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
