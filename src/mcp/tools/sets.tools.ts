import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { SetService } from 'src/core/set/set.service';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { completionRate } from 'src/http/base/http.util';
import { CardApiPresenter } from 'src/http/api/card/card-api.presenter';
import { SealedProductApiPresenter } from 'src/http/api/sealed-product/sealed-product-api.presenter';
import { SetApiPresenter } from 'src/http/api/set/set-api.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';
import { READ_ONLY, limitParam, pageParam } from './common';

const setCardFilters = {
    rarity: z.enum(['common', 'uncommon', 'rare', 'mythic']).optional().describe('Filter by rarity.'),
    type: z
        .string()
        .optional()
        .describe("Substring match against card type line (e.g. 'Goblin', 'Instant')."),
    format: z
        .string()
        .optional()
        .describe("Filter to cards with a legality entry in this format (e.g. 'modern', 'commander')."),
    legality: z
        .enum(['legal', 'banned', 'restricted'])
        .optional()
        .describe("Used with 'format'. Defaults to 'legal' when format is set."),
    page: pageParam,
    limit: limitParam,
};

/**
 * Read-only set + sealed-product tools, mirroring `SetApiController` and the
 * read endpoints of `SealedProductApiController`.
 */
@Injectable()
export class SetMcpTools {
    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        @Inject(SealedProductService) private readonly sealedProductService: SealedProductService
    ) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'search_sets',
                description:
                    'List Magic: The Gathering sets, optionally paginated. Returns set code, name, release date, type, and aggregate prices.',
                inputSchema: z.object({
                    page: pageParam,
                    limit: limitParam,
                }),
                requiresAuth: false,
                annotations: READ_ONLY,
                handler: async (args, ctx) => this.searchSets(args, ctx),
            },
            {
                name: 'get_set',
                description: "Get detail for a single set by code (e.g. 'lea', 'mh3').",
                inputSchema: z.object({
                    code: z.string().describe("Set code (e.g. 'lea', 'mh3')."),
                }),
                requiresAuth: false,
                annotations: READ_ONLY,
                handler: async (args) => this.getSet(args),
            },
            {
                name: 'list_set_cards',
                description:
                    'List all cards in a set, paginated. Supports the same filters as search_cards (rarity, type, format, legality).',
                inputSchema: z.object({
                    code: z.string().describe('Set code.'),
                    ...setCardFilters,
                }),
                requiresAuth: false,
                annotations: READ_ONLY,
                handler: async (args) => this.listSetCards(args),
            },
            {
                name: 'get_sealed_products',
                description:
                    'List sealed products (booster boxes, bundles, commander decks, etc.) for a set. Each entry includes a TCGPlayer purchase URL.',
                inputSchema: z.object({ code: z.string().describe('Set code.') }),
                requiresAuth: false,
                annotations: READ_ONLY,
                handler: async (args, ctx) => this.getSealedProducts(args, ctx),
            },
        ];
    }

    private async searchSets(
        args: { page?: number; limit?: number },
        ctx: McpToolContext
    ): Promise<unknown> {
        const options = new SafeQueryOptions(this.toQuery(args)).withSetTypes(
            ctx.user?.includedSetTypes ?? null
        );
        const [sets, total] = await Promise.all([
            this.setService.findSets(options),
            this.setService.totalSetsCount(options),
        ]);
        const meta = new PaginationMeta(options.page, options.limit, total);

        const userId = ctx.user?.id;
        if (!userId) {
            return ApiResponseDto.ok(
                sets.map((s) => SetApiPresenter.toSetApiResponse(s)),
                meta
            );
        }

        const setCodes = sets.map((s) => s.code);
        const [totalsMap, valuesMap, subscribed] = await Promise.all([
            this.inventoryService.inventoryTotalsForSets(userId, setCodes),
            this.inventoryService.ownedValuesForSets(userId, setCodes),
            this.subscriptionService.isUserSubscribed(userId),
        ]);

        const data = sets.map((s) => {
            const dto = SetApiPresenter.toSetApiResponse(s);
            const ownedTotal = totalsMap.get(s.code) ?? 0;
            const ownedValue = valuesMap.get(s.code) ?? 0;
            return {
                ...dto,
                ownedTotal,
                ownedValue,
                ...(subscribed
                    ? { completionRate: completionRate(ownedTotal, s.effectiveSize) }
                    : {}),
            };
        });
        return ApiResponseDto.ok(data, meta);
    }

    private async getSet(args: { code: string }): Promise<unknown> {
        const set = await this.setService.findByCode(args.code.trim().toLowerCase());
        if (!set) {
            throw new NotFoundException('Set not found');
        }
        return ApiResponseDto.ok(SetApiPresenter.toSetApiResponse(set));
    }

    private async listSetCards(args: { code: string } & Record<string, unknown>): Promise<unknown> {
        const { code: rawCode, ...rest } = args;
        const code = rawCode.trim().toLowerCase();
        const options = new SafeQueryOptions(this.toQuery(rest));
        const set = await this.setService.findByCode(code);
        const effectiveOptions = set && !set.isMain ? options.withBaseOnly(false) : options;
        const [cards, total] = await Promise.all([
            this.cardService.findBySet(code, effectiveOptions),
            this.cardService.totalInSet(code, effectiveOptions),
        ]);
        return ApiResponseDto.ok(
            cards.map((c) => CardApiPresenter.toCardApiResponse(c)),
            new PaginationMeta(effectiveOptions.page, effectiveOptions.limit, total)
        );
    }

    private async getSealedProducts(args: { code: string }, ctx: McpToolContext): Promise<unknown> {
        const code = args.code.trim().toLowerCase();
        const options = new SafeQueryOptions({});
        const [products, total] = await Promise.all([
            this.sealedProductService.findBySetCode(code, options),
            this.sealedProductService.totalBySetCode(code),
        ]);

        const userId = ctx.user?.id;
        let quantities = new Map<string, number>();
        if (userId && products.length > 0) {
            quantities = await this.sealedProductService.findInventoryQuantitiesForUser(
                userId,
                products.map((p) => p.uuid)
            );
        }

        return ApiResponseDto.ok(
            products.map((p) => {
                const dto = SealedProductApiPresenter.toResponse(p);
                if (userId) {
                    dto.ownedQuantity = quantities.get(p.uuid) ?? 0;
                }
                return dto;
            }),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    private toQuery(args: Record<string, unknown>): Record<string, string> {
        const query: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) query[key] = String(value);
        }
        return query;
    }
}
