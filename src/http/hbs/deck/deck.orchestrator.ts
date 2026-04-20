import { Inject, Injectable } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { FORMAT_LABELS, labelFormat } from 'src/core/card/format.labels';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { formatUtcTimestamp } from 'src/http/base/date.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { buildCardUrl } from 'src/shared/utils/card-url.util';
import { getLogger } from 'src/logger/global-app-logger';
import { DeckDetailViewDto, DeckDetailCard, DeckTypeGroup, DeckWarning } from './dto/deck-detail.view.dto';
import { DeckListViewDto } from './dto/deck-list.view.dto';

const FORMAT_OPTIONS = [
    { value: '', label: 'Freestyle (no format)' },
    ...Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label })),
];

const BASIC_LANDS = new Set([
    'Plains',
    'Island',
    'Swamp',
    'Mountain',
    'Forest',
    'Wastes',
    'Snow-Covered Plains',
    'Snow-Covered Island',
    'Snow-Covered Swamp',
    'Snow-Covered Mountain',
    'Snow-Covered Forest',
]);

// Singleton formats: exactly 1 copy of any non-basic card
const SINGLETON_FORMATS = new Set<Format>([Format.Commander, Format.Oathbreaker, Format.Brawl]);
// Commander-style decks target 100 cards main
const HUNDRED_CARD_FORMATS = new Set<Format>([
    Format.Commander,
    Format.Oathbreaker,
    Format.Brawl,
]);
const MIN_MAIN = 60;
const MAX_SIDEBOARD = 15;

function typeCategory(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t.includes('creature')) return 'Creature';
    if (t.includes('planeswalker')) return 'Planeswalker';
    if (t.includes('instant')) return 'Instant';
    if (t.includes('sorcery')) return 'Sorcery';
    if (t.includes('artifact')) return 'Artifact';
    if (t.includes('enchantment')) return 'Enchantment';
    if (t.includes('land')) return 'Land';
    if (t.includes('battle')) return 'Battle';
    return 'Other';
}

const TYPE_ORDER = [
    'Creature',
    'Planeswalker',
    'Instant',
    'Sorcery',
    'Artifact',
    'Enchantment',
    'Battle',
    'Land',
    'Other',
];

@Injectable()
export class DeckOrchestrator {
    private readonly LOGGER = getLogger(DeckOrchestrator.name);

    constructor(@Inject(DeckService) private readonly deckService: DeckService) {}

    async buildListView(req: AuthenticatedRequest): Promise<DeckListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const summaries = await this.deckService.findDecksForUser(req.user.id);
            return new DeckListViewDto({
                authenticated: true,
                title: 'My Decks - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Decks', url: '/decks' },
                ],
                decks: summaries.map((s) => ({
                    id: s.deck.id,
                    name: s.deck.name,
                    format: s.deck.format,
                    formatLabel: labelFormat(s.deck.format),
                    cardCount: s.cardCount,
                    sideboardCount: s.sideboardCount,
                    updatedAt: formatUtcTimestamp(s.deck.updatedAt),
                })),
                formats: FORMAT_OPTIONS,
            });
        } catch (error) {
            this.LOGGER.debug(`buildListView error: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }

    async buildDetailView(
        req: AuthenticatedRequest,
        deckId: number
    ): Promise<DeckDetailViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const deck = await this.deckService.findDeckWithCards(deckId, req.user.id);
            return this.toDetailView(deck);
        } catch (error) {
            this.LOGGER.debug(`buildDetailView error: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildDetailView');
        }
    }

    private toDetailView(deck: Deck): DeckDetailViewDto {
        const cards = deck.cards ?? [];
        const mainCards: DeckDetailCard[] = [];
        const sideboardCards: DeckDetailCard[] = [];
        let totalValue = 0;

        for (const dc of cards) {
            const detail = this.toDetailCard(dc, deck.format);
            totalValue += detail.lineTotal;
            if (dc.isSideboard) sideboardCards.push(detail);
            else mainCards.push(detail);
        }

        const groups = this.groupByType(mainCards);
        const mainCount = mainCards.reduce((s, c) => s + c.quantity, 0);
        const sideboardCount = sideboardCards.reduce((s, c) => s + c.quantity, 0);

        return new DeckDetailViewDto({
            authenticated: true,
            title: `${deck.name} - I Want My MTG`,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Decks', url: '/decks' },
                { label: deck.name, url: `/decks/${deck.id}` },
            ],
            deck: {
                id: deck.id!,
                name: deck.name,
                format: deck.format,
                formatLabel: labelFormat(deck.format),
                description: deck.description,
                updatedAt: formatUtcTimestamp(deck.updatedAt),
            },
            mainGroups: groups,
            sideboard: sideboardCards,
            mainCount,
            sideboardCount,
            totalValue: Math.round(totalValue * 100) / 100,
            warnings: this.buildWarnings(deck, mainCards, sideboardCards, mainCount, sideboardCount),
            formats: FORMAT_OPTIONS,
        });
    }

    private toDetailCard(dc: DeckCard, deckFormat: Format | null): DeckDetailCard {
        const card = dc.card;
        const latest = card?.prices?.[0];
        const unitPrice = latest
            ? PriceCalculationPolicy.calculateCardValue(
                  latest.normal ?? null,
                  latest.foil ?? null,
                  false
              )
            : 0;
        const isBanned =
            deckFormat != null &&
            !!card?.legalities?.find(
                (l) => l.format === deckFormat && l.status === LegalityStatus.Banned
            );
        const setCode = card?.setCode ?? '';
        const number = card?.number ?? '';
        return {
            cardId: dc.cardId,
            quantity: dc.quantity,
            isSideboard: dc.isSideboard,
            name: card?.name ?? dc.cardId,
            number,
            setCode,
            cardUrl: setCode && number ? buildCardUrl(setCode, number) : '',
            imgSrc: card?.imgSrc ?? '',
            type: card?.type ?? '',
            manaCost: card?.manaCost,
            typeCategory: typeCategory(card?.type ?? ''),
            price: unitPrice || null,
            lineTotal: Math.round(unitPrice * dc.quantity * 100) / 100,
            isBanned,
        };
    }

    private groupByType(cards: DeckDetailCard[]): DeckTypeGroup[] {
        const byType = new Map<string, DeckDetailCard[]>();
        for (const c of cards) {
            const list = byType.get(c.typeCategory) ?? [];
            list.push(c);
            byType.set(c.typeCategory, list);
        }
        return TYPE_ORDER.filter((t) => byType.has(t)).map((t) => {
            const list = byType.get(t)!.sort((a, b) => a.name.localeCompare(b.name));
            return {
                label: t,
                count: list.reduce((s, c) => s + c.quantity, 0),
                cards: list,
            };
        });
    }

    private buildWarnings(
        deck: Deck,
        main: DeckDetailCard[],
        sideboard: DeckDetailCard[],
        mainCount: number,
        sideboardCount: number
    ): DeckWarning[] {
        const warnings: DeckWarning[] = [];
        const format = deck.format;

        const targetMain = format && HUNDRED_CARD_FORMATS.has(format) ? 100 : MIN_MAIN;
        if (format && HUNDRED_CARD_FORMATS.has(format)) {
            if (mainCount !== targetMain) {
                warnings.push({
                    kind: 'size',
                    message: `${labelFormat(format)} decks must have exactly ${targetMain} cards (currently ${mainCount}).`,
                });
            }
        } else if (mainCount < MIN_MAIN) {
            warnings.push({
                kind: 'size',
                message: `Main deck must have at least ${MIN_MAIN} cards (currently ${mainCount}).`,
            });
        }

        if (sideboardCount > MAX_SIDEBOARD) {
            warnings.push({
                kind: 'sideboard',
                message: `Sideboard exceeds ${MAX_SIDEBOARD} cards (currently ${sideboardCount}).`,
            });
        }

        if (format) {
            const perCardCopies = new Map<string, number>();
            for (const c of [...main, ...sideboard]) {
                perCardCopies.set(c.name, (perCardCopies.get(c.name) ?? 0) + c.quantity);
            }
            const isSingleton = SINGLETON_FORMATS.has(format);
            const copyLimit = isSingleton ? 1 : 4;
            const overLimit: string[] = [];
            for (const [name, count] of perCardCopies) {
                if (this.isBasicLand(name)) continue;
                if (count > copyLimit) overLimit.push(`${name} (${count})`);
            }
            if (overLimit.length > 0) {
                warnings.push({
                    kind: 'copies',
                    message: `Exceeds ${copyLimit}-copy limit: ${overLimit.join(', ')}.`,
                });
            }

            const banned = [...main, ...sideboard].filter((c) => c.isBanned);
            if (banned.length > 0) {
                warnings.push({
                    kind: 'banned',
                    message: `Banned in ${labelFormat(format)}: ${banned
                        .map((c) => c.name)
                        .join(', ')}.`,
                });
            }
        }

        return warnings;
    }

    private isBasicLand(name: string): boolean {
        return BASIC_LANDS.has(name);
    }
}
