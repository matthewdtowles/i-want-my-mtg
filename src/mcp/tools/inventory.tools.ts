import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { InventoryApiPresenter } from 'src/http/api/inventory/inventory-api.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';

const inventoryItem = z.object({
    cardId: z
        .string()
        .uuid()
        .describe('Internal IWMM card UUID. Get from search_cards or get_card.'),
    quantity: z
        .number()
        .int()
        .min(0)
        .describe('Total quantity for this card+finish. 0 removes the row.'),
    isFoil: z
        .boolean()
        .describe(
            'Whether this is the foil variant. Foil and non-foil are tracked as separate rows.'
        ),
});

type InventoryItemInput = z.infer<typeof inventoryItem>;

/** Authenticated inventory tools, mirroring `InventoryApiController`. */
@Injectable()
export class InventoryMcpTools {
    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'list_inventory',
                description:
                    "List the authenticated user's card inventory, paginated. Requires IWMM_API_KEY. Returns cards with quantities, prices, and metadata.",
                inputSchema: z.object({
                    page: z.number().int().min(1).optional(),
                    limit: z.number().int().min(1).max(100).optional(),
                }),
                requiresAuth: true,
                handler: async (args, ctx) => this.list(args, ctx),
            },
            {
                name: 'get_inventory_quantities',
                description:
                    'Batch lookup: given a list of card UUIDs, return how many of each (normal + foil) the user owns. Useful before recommending adds. Requires IWMM_API_KEY.',
                inputSchema: z.object({ cardIds: z.array(z.string().trim().uuid()).min(1).max(200) }),
                requiresAuth: true,
                handler: async (args, ctx) => this.getQuantities(args, ctx),
            },
            {
                name: 'add_inventory',
                description:
                    "Add one or more cards to the authenticated user's inventory. Accepts a batch - pass a single-item array for one card. This is a real write. Use update_inventory to change quantities, remove_inventory to delete a row. Requires IWMM_API_KEY.",
                inputSchema: z.object({ items: z.array(inventoryItem).min(1) }),
                requiresAuth: true,
                handler: async (args, ctx) => this.save(args, ctx),
            },
            {
                name: 'update_inventory',
                description:
                    'Update quantities for one or more existing inventory rows. Accepts a batch. Use remove_inventory to delete a row entirely. Requires IWMM_API_KEY.',
                inputSchema: z.object({ items: z.array(inventoryItem).min(1) }),
                requiresAuth: true,
                handler: async (args, ctx) => this.save(args, ctx),
            },
            {
                name: 'remove_inventory',
                description:
                    "Remove a card+finish row from the authenticated user's inventory. Requires IWMM_API_KEY.",
                inputSchema: z.object({ cardId: z.string().uuid(), isFoil: z.boolean() }),
                requiresAuth: true,
                handler: async (args, ctx) => this.remove(args, ctx),
            },
        ];
    }

    private async list(
        args: { page?: number; limit?: number },
        ctx: McpToolContext
    ): Promise<unknown> {
        const options = new SafeQueryOptions(this.toQuery(args));
        const [items, total] = await Promise.all([
            this.inventoryService.findAllForUser(ctx.user.id, options),
            this.inventoryService.totalInventoryItems(ctx.user.id, options),
        ]);
        return ApiResponseDto.ok(
            items.map((item) => InventoryApiPresenter.toInventoryItem(item)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    private async getQuantities(
        args: { cardIds: string[] },
        ctx: McpToolContext
    ): Promise<unknown> {
        const ids = [...new Set(args.cardIds.map((id) => id.trim()).filter(Boolean))];
        if (ids.length === 0) {
            return ApiResponseDto.ok([]);
        }
        if (ids.length > 200) {
            throw new BadRequestException('Maximum of 200 card IDs allowed per request');
        }
        const items = await this.inventoryService.findByCards(ctx.user.id, ids);
        return ApiResponseDto.ok(InventoryApiPresenter.toQuantityResponse(items));
    }

    private async save(
        args: { items: InventoryItemInput[] },
        ctx: McpToolContext
    ): Promise<unknown> {
        const items = args.items.map(
            (dto) =>
                new Inventory({
                    cardId: dto.cardId,
                    userId: ctx.user.id,
                    isFoil: dto.isFoil,
                    quantity: dto.quantity,
                })
        );
        const saved = await this.inventoryService.save(items);
        return ApiResponseDto.ok(saved.map((item) => InventoryApiPresenter.toInventoryItem(item)));
    }

    private async remove(
        args: { cardId: string; isFoil: boolean },
        ctx: McpToolContext
    ): Promise<unknown> {
        const deleted = await this.inventoryService.delete(ctx.user.id, args.cardId, args.isFoil);
        return ApiResponseDto.ok({ deleted });
    }

    private toQuery(args: Record<string, unknown>): Record<string, string> {
        const query: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) query[key] = String(value);
        }
        return query;
    }
}
