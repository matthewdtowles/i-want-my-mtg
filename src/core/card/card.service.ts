import { Inject, Injectable } from '@nestjs/common';
import { PriceMoverQueryOptions } from 'src/core/query/price-mover-query-options.dto';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { normalizeSetCode } from 'src/shared/utils/set-code.util';
import { Card } from './card.entity';
import { GranularPrice } from './granular-price.entity';
import { PriceMover, WeeklyMove } from './price-mover.entity';
import { CardRepositoryPort } from './ports/card.repository.port';
import { GranularPriceRepositoryPort } from './ports/granular-price.repository.port';
import { PriceHistoryRepositoryPort } from './ports/price-history.repository.port';
import { Price } from './price.entity';

/**
 * Covers only change when the daily ingest reprices a set, but the query behind
 * them reads every card in the requested sets plus their prices: ~0.3s warm and
 * 1.3s cold on prod, on every home and /sets render. On 2026-10-05 it was what
 * all 10 pool connections were running when the overloaded DB stopped answering.
 * An hour keeps a new day's covers at most an hour late.
 */
const COVER_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * The week's moves only change with the daily ingest, but finding them reads the
 * whole catalog and a week of history for every big move: 1-5s on prod when every
 * movers request did it. An hour keeps a new day's moves at most an hour late.
 */
const MOVES_CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CardService {
    private readonly LOGGER = getLogger(CardService.name);
    // Keyed by normalized set code. `img: null` records a set with no cover,
    // so it is not looked up again on every render.
    private readonly coverCache = new Map<string, { img: string | null; expires: number }>();
    // The promise is cached, not its result, so requests that arrive while the
    // moves are being loaded share the one load.
    private movesCache: { moves: Promise<WeeklyMove[]>; expires: number } | undefined;

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(PriceHistoryRepositoryPort)
        private readonly priceHistoryRepository: PriceHistoryRepositoryPort,
        @Inject(GranularPriceRepositoryPort)
        private readonly granularPriceRepository: GranularPriceRepositoryPort
    ) {}

    async findByIds(ids: string[]): Promise<Card[]> {
        this.LOGGER.debug(`Find ${ids.length} cards by ids.`);
        return this.repository.findByIds(ids);
    }

    /**
     * @returns the total number of cards in the catalog (all sets).
     */
    async totalCards(): Promise<number> {
        return this.repository.totalCards();
    }

    async findByIdsWithPrices(ids: string[]): Promise<Card[]> {
        this.LOGGER.debug(`Find ${ids.length} cards by ids with latest prices.`);
        return this.repository.findByIds(ids, { includeLatestPrice: true });
    }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find cards with name ${name}.`);
        const cards = await this.repository.findWithName(name, options);
        this.LOGGER.debug(`Found ${cards?.length} with name ${name}.`);
        return cards;
    }

    async findBySet(code: string, query: SafeQueryOptions): Promise<Card[]> {
        code = normalizeSetCode(code);
        this.LOGGER.debug(`Find cards in set ${code}.`);
        const cards = await this.repository.findBySet(code, query);
        this.LOGGER.debug(`Found ${cards?.length} in set ${code}.`);
        return cards;
    }

    /**
     * Cover art tails keyed by set code; see the port for why this is batched.
     * Keys in the returned map are the normalized (lowercase) codes.
     */
    async coverImagesForSets(setCodes: string[]): Promise<Map<string, string>> {
        const normalized = setCodes.map(normalizeSetCode).filter(Boolean);
        const now = Date.now();
        const missing = normalized.filter((code) => !(this.coverCache.get(code)?.expires > now));
        this.LOGGER.debug(
            `Find cover images for ${normalized.length} sets (${missing.length} not cached).`
        );
        if (missing.length > 0) {
            const found = await this.repository.findCoverImagesForSets(missing);
            const expires = now + COVER_CACHE_TTL_MS;
            for (const code of missing) {
                this.coverCache.set(code, { img: found.get(code) ?? null, expires });
            }
        }
        const result = new Map<string, string>();
        for (const code of normalized) {
            const img = this.coverCache.get(code)?.img;
            if (img) result.set(code, img);
        }
        return result;
    }

    async findBySetCodeAndNumber(code: string, number: string): Promise<Card | null> {
        code = normalizeSetCode(code);
        this.LOGGER.debug(`Find card no. ${number} in set ${code}.`);
        const card = await this.repository.findBySetCodeAndNumber(code, number, [
            'set',
            'legalities',
            'prices',
        ]);
        this.LOGGER.debug(`Card no. ${number} in set ${code}: ${card ? card.id : 'Not found'}.`);
        return card;
    }

    async totalWithName(name: string): Promise<number> {
        this.LOGGER.debug(`Find total number of cards with name ${name}.`);
        const total = await this.repository.totalWithName(name);
        this.LOGGER.debug(`Total cards with name ${name}: ${total}.`);
        return total;
    }

    async searchByName(filter: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Search cards by name: ${filter}.`);
        return this.repository.searchByName(filter, options);
    }

    async totalSearchByName(filter: string, options?: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Count search results for: ${filter}.`);
        return this.repository.totalSearchByName(filter, options);
    }

    async searchByNameGrouped(filter: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Grouped search cards by name: ${filter}.`);
        return this.repository.searchByNameGrouped(filter, options);
    }

    async totalSearchByNameGrouped(filter: string, options?: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Count grouped search results for: ${filter}.`);
        return this.repository.totalSearchByNameGrouped(filter, options);
    }

    async totalInSet(code: string, options: SafeQueryOptions): Promise<number> {
        code = normalizeSetCode(code);
        this.LOGGER.debug(
            `Find total number of cards in set ${code}, options: ${JSON.stringify(options)}.`
        );
        const total = await this.repository.totalInSet(code, options);
        this.LOGGER.debug(`Total cards in set ${code}: ${total}.`);
        return total;
    }

    async findPriceHistory(cardId: string, days?: number): Promise<Price[]> {
        this.LOGGER.debug(`Find price history for card ${cardId}, days=${days}.`);
        const prices = await this.priceHistoryRepository.findByCardId(cardId, days);
        this.LOGGER.debug(`Found ${prices?.length} price history records for card ${cardId}.`);
        return prices;
    }

    /**
     * The week's biggest price moves, one per printing and finish, ranked by
     * `options.by` in `options.direction`, each with its card and latest prices.
     * Only moves where the old or new price is at least `options.minPrice` count.
     * Takes the catalog filters (setCode, rarity, type, format/legality) and
     * `finish`. Flipping prices and cards from new sets are left out (see
     * CardRepositoryPort.findFlippingPrices and findWeeklyMoves).
     */
    async findPriceMovers(
        options: PriceMoverQueryOptions
    ): Promise<{ movers: PriceMover[]; total: number }> {
        this.LOGGER.debug(`Find price movers, options: ${JSON.stringify(options)}.`);
        const type = options.type?.toLowerCase();
        let matches = (await this.weeklyMoves()).filter(
            (m) =>
                (options.direction === 'up' ? m.change > 0 : m.change < 0) &&
                Math.max(m.price, m.previousPrice) >= options.minPrice &&
                (!options.finish || m.finish === options.finish) &&
                (!options.setCode || m.setCode === options.setCode) &&
                (!options.rarity || m.rarity === options.rarity) &&
                (!type || m.type.toLowerCase().includes(type))
        );
        if (options.format && options.legality) {
            const cardIds = [...new Set(matches.map((m) => m.cardId))];
            const legal = new Set(
                await this.repository.findCardIdsWithLegality(
                    cardIds,
                    options.format,
                    options.legality
                )
            );
            matches = matches.filter((m) => legal.has(m.cardId));
        }

        const rank = (m: WeeklyMove) =>
            options.by === 'amount' ? m.change : m.change / m.previousPrice;
        const sign = options.direction === 'up' ? -1 : 1;
        matches.sort(
            (a, b) =>
                sign * (rank(a) - rank(b)) ||
                (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0) ||
                (a.finish < b.finish ? -1 : a.finish > b.finish ? 1 : 0)
        );
        const start = (options.page - 1) * options.limit;
        const page = matches.slice(start, start + options.limit);

        const cardIds = [...new Set(page.map((m) => m.cardId))];
        const cards = await this.repository.findByIds(cardIds, {
            includeLatestPrice: true,
            includeSet: true,
        });
        const cardsById = new Map(cards.map((c) => [c.id, c]));
        const movers: PriceMover[] = [];
        for (const m of page) {
            const card = cardsById.get(m.cardId);
            if (card) {
                movers.push({
                    cardId: m.cardId,
                    finish: m.finish,
                    price: m.price,
                    previousPrice: m.previousPrice,
                    change: m.change,
                    changePercent: m.changePercent,
                    card,
                });
            }
        }
        return { movers, total: matches.length };
    }

    private weeklyMoves(): Promise<WeeklyMove[]> {
        const now = Date.now();
        if (!(this.movesCache?.expires > now)) {
            const moves = Promise.all([
                this.repository.findWeeklyMoves(),
                this.repository.findFlippingPrices(),
            ]).then(([all, flipping]) => {
                const flipped = new Set(flipping.map((f) => `${f.cardId}:${f.finish}`));
                return all.filter((m) => !flipped.has(`${m.cardId}:${m.finish}`));
            });
            this.movesCache = { moves, expires: now + MOVES_CACHE_TTL_MS };
            // A failed load is not cached: the next request tries again.
            moves.catch(() => {
                if (this.movesCache?.moves === moves) this.movesCache = undefined;
            });
        }
        return this.movesCache.moves;
    }

    async findCurrentBuylist(cardId: string): Promise<GranularPrice[]> {
        this.LOGGER.debug(`Find current buylist for card ${cardId}.`);
        return this.granularPriceRepository.findCurrentBuylistByCardId(cardId);
    }

    /**
     * Current buylist offers for many cards, grouped by card id. Empty map for
     * an empty input. Currently unused at call sites (buylist was trimmed to the
     * card page in 6.3.1); kept for 6.4 inventory best-buylist, which needs this
     * batched read.
     */
    async findCurrentBuylistForCards(cardIds: string[]): Promise<Map<string, GranularPrice[]>> {
        this.LOGGER.debug(`Find current buylist for ${cardIds.length} cards.`);
        const grouped = new Map<string, GranularPrice[]>();
        if (cardIds.length === 0) {
            return grouped;
        }
        const offers = await this.granularPriceRepository.findCurrentBuylistByCardIds(cardIds);
        for (const offer of offers) {
            const list = grouped.get(offer.cardId);
            if (list) {
                list.push(offer);
            } else {
                grouped.set(offer.cardId, [offer]);
            }
        }
        return grouped;
    }
}
