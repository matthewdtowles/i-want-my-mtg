import { Inject, Injectable } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { Card } from './card.entity';
import { GranularPrice } from './granular-price.entity';
import { CardRepositoryPort } from './ports/card.repository.port';
import { GranularPriceRepositoryPort } from './ports/granular-price.repository.port';
import { PriceHistoryRepositoryPort } from './ports/price-history.repository.port';
import { Price } from './price.entity';

@Injectable()
export class CardService {
    private readonly LOGGER = getLogger(CardService.name);

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
        this.LOGGER.debug(`Find cards in set ${code}.`);
        const cards = await this.repository.findBySet(code, query);
        this.LOGGER.debug(`Found ${cards?.length} in set ${code}.`);
        return cards;
    }

    async findBySetCodeAndNumber(code: string, number: string): Promise<Card | null> {
        // Set codes are stored lowercase and the repo query is case-sensitive,
        // so normalize here (one place for every caller — REST/MCP/HBS).
        code = code?.trim().toLowerCase();
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
