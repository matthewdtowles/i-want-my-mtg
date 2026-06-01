import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { CardService } from 'src/core/card/card.service';
import { SearchQueryOptions } from 'src/core/query/search-query-options.dto';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { parseDaysParam } from 'src/http/base/query.util';
import { CardApiPresenter } from 'src/http/api/card/card-api.presenter';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { McpToolDefinition } from '../mcp-tool.types';

const cardKeySchema = {
    setCode: z.string().describe("Set code (e.g. 'lea')."),
    setNumber: z
        .string()
        .describe(
            "Collector number within the set (e.g. '161'). String, not int - some sets use suffixes like '12a'."
        ),
};

/**
 * Read-only card tools. Each handler mirrors the matching `CardApiController`
 * method (same services + presenter, same `ApiResponseDto` envelope).
 */
@Injectable()
export class CardMcpTools {
    constructor(@Inject(CardService) private readonly cardService: CardService) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'search_cards',
                description:
                    'Search Magic: The Gathering cards by name (substring), set code, rarity, type, or format legality. Returns a paginated list with prices and basic metadata. Use this for catalog lookups; for a specific printing prefer get_card with set+number.',
                inputSchema: z.object({
                    q: z
                        .string()
                        .optional()
                        .describe(
                            'Substring to search card name + flavor name. Optional; omit to filter purely by setCode/rarity/type/format.'
                        ),
                    setCode: z
                        .string()
                        .optional()
                        .describe("3-5 character set code (e.g. 'lea', 'mh3')."),
                    rarity: z
                        .enum(['common', 'uncommon', 'rare', 'mythic'])
                        .optional()
                        .describe('Filter by rarity.'),
                    type: z
                        .string()
                        .optional()
                        .describe(
                            "Substring match against card type line (e.g. 'Goblin', 'Instant')."
                        ),
                    format: z
                        .string()
                        .optional()
                        .describe(
                            "Filter to cards with a legality entry in this format (e.g. 'modern', 'commander')."
                        ),
                    legality: z
                        .enum(['legal', 'banned', 'restricted'])
                        .optional()
                        .describe("Used with 'format'. Defaults to 'legal' when format is set."),
                    page: z.number().int().min(1).optional().describe('1-based page index.'),
                    limit: z
                        .number()
                        .int()
                        .min(1)
                        .max(100)
                        .optional()
                        .describe('Page size (max 100).'),
                }),
                requiresAuth: false,
                handler: async (args) => this.searchCards(args),
            },
            {
                name: 'get_card',
                description:
                    'Look up a specific card printing by set code and collector number. Returns full card detail including current prices, rarity, type, and flavor name. For broader catalog search use search_cards.',
                inputSchema: z.object(cardKeySchema),
                requiresAuth: false,
                handler: async (args) => this.getCard(args),
            },
            {
                name: 'get_card_prices',
                description: 'Get current normal and foil prices for a specific card printing.',
                inputSchema: z.object(cardKeySchema),
                requiresAuth: false,
                handler: async (args) => this.getCardPrices(args),
            },
            {
                name: 'get_card_price_history',
                description:
                    'Get the 30-day price history for a card printing (normal + foil). Older data is retained on a weekly/monthly cadence beyond 30 days.',
                inputSchema: z.object(cardKeySchema),
                requiresAuth: false,
                handler: async (args) => this.getCardPriceHistory(args),
            },
        ];
    }

    private async searchCards(args: Record<string, unknown>): Promise<unknown> {
        const options = new SearchQueryOptions(this.toQuery(args));
        if (!options.q) {
            return ApiResponseDto.ok([], new PaginationMeta(1, options.limit, 0));
        }
        const [cards, total] = await Promise.all([
            this.cardService.searchByName(options.q, options),
            this.cardService.totalSearchByName(options.q, options),
        ]);
        return ApiResponseDto.ok(
            cards.map((c) => CardApiPresenter.toCardApiResponse(c)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    private async getCard(args: { setCode: string; setNumber: string }): Promise<unknown> {
        const card = await this.cardService.findBySetCodeAndNumber(args.setCode, args.setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        return ApiResponseDto.ok(CardApiPresenter.toCardApiResponse(card));
    }

    private async getCardPrices(args: { setCode: string; setNumber: string }): Promise<unknown> {
        const card = await this.cardService.findBySetCodeAndNumber(args.setCode, args.setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        const withPrices = await this.cardService.findByIdsWithPrices([card.id]);
        if (!withPrices || withPrices.length === 0) {
            throw new NotFoundException('Card not found');
        }
        return ApiResponseDto.ok(CardApiPresenter.toCardApiResponse(withPrices[0]));
    }

    private async getCardPriceHistory(args: {
        setCode: string;
        setNumber: string;
    }): Promise<unknown> {
        const card = await this.cardService.findBySetCodeAndNumber(args.setCode, args.setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        const prices = await this.cardService.findPriceHistory(card.id, parseDaysParam(undefined));
        return ApiResponseDto.ok(prices.map(CardPresenter.toPriceHistoryPoint));
    }

    private toQuery(args: Record<string, unknown>): Record<string, string> {
        const query: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) query[key] = String(value);
        }
        return query;
    }
}
