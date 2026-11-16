import { Inject, Injectable } from '@nestjs/common';
import { PriceMoverQueryOptions } from 'src/core/query/price-mover-query-options.dto';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { normalizeSetCode } from 'src/shared/utils/set-code.util';
import { Card } from './card.entity';
import { GranularPrice } from './granular-price.entity';
import { PriceFinish, PriceMover } from './price-mover.entity';
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
 * The flipping prices left out of the movers only change with the daily ingest,
 * but finding them reads a week of history for every big move: 1-5s on prod when
 * every movers request did it. An hour keeps a new day's flips at most an hour late.
 */
const FLIP_CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CardService {
    private readonly LOGGER = getLogger(CardService.name);
    // Keyed by normalized set code. `img: null` records a set with no cover,
    // so it is not looked up again on every render.
    private readonly coverCache = new Map<string, { img: string | null; expires: number }>();
    // The promise is cached, not its result, so requests that arrive while the
    // flips are being found share the one query.
    private flipCache: { flips: Promise<PriceFinish[]>; expires: number } | undefined;

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
     * The week's biggest price moves (see CardRepositoryPort.findPriceMovers), each
     * with its card and latest prices.
     */
    async findPriceMovers(
        options: PriceMoverQueryOptions
    ): Promise<{ movers: PriceMover[]; total: number }> {
        this.LOGGER.debug(`Find price movers, options: ${JSON.stringify(options)}.`);
        const flipping = await this.flippingPrices();
        const { rows, total } = await this.repository.findPriceMovers(options, flipping);
        const cardIds = [...new Set(rows.map((r) => r.cardId))];
        const cards = await this.repository.findByIds(cardIds, {
            includeLatestPrice: true,
            includeSet: true,
        });
        const cardsById = new Map(cards.map((c) => [c.id, c]));
        const movers: PriceMover[] = [];
        for (const row of rows) {
            const card = cardsById.get(row.cardId);
            if (card) movers.push({ ...row, card });
        }
        return { movers, total };
    }

    private flippingPrices(): Promise<PriceFinish[]> {
        const now = Date.now();
        if (!(this.flipCache?.expires > now)) {
            const flips = this.repository.findFlippingPrices();
            this.flipCache = { flips, expires: now + FLIP_CACHE_TTL_MS };
            // A failed query is not cached: the next request tries again.
            flips.catch(() => {
                if (this.flipCache?.flips === flips) this.flipCache = undefined;
            });
        }
        return this.flipCache.flips;
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
