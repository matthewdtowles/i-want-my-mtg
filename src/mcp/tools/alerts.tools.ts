import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { PriceAlertApiPresenter } from 'src/http/api/price-alert/price-alert-api.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';

const thresholdRefinement = (v: { increasePct?: number | null; decreasePct?: number | null }) =>
    v.increasePct != null || v.decreasePct != null;

/** Authenticated price-alert tools, mirroring `PriceAlertApiController`. */
@Injectable()
export class AlertMcpTools {
    constructor(@Inject(PriceAlertService) private readonly priceAlertService: PriceAlertService) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'list_price_alerts',
                description:
                    "List the authenticated user's price alerts. Free tier is capped at 5 active alerts and a single threshold direction per alert; Premium removes both limits. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.list(ctx),
            },
            {
                name: 'create_price_alert',
                description:
                    'Create a price alert for a card. Supply increasePct, decreasePct, or both (Premium). At least one threshold is required. Requires IWMM_API_KEY.',
                inputSchema: z
                    .object({
                        cardId: z.string().uuid().describe('Internal IWMM card UUID.'),
                        increasePct: z
                            .number()
                            .min(0.01)
                            .optional()
                            .describe('Trigger when price increases by at least this percent.'),
                        decreasePct: z
                            .number()
                            .min(0.01)
                            .optional()
                            .describe('Trigger when price decreases by at least this percent.'),
                    })
                    .refine(thresholdRefinement, {
                        message: 'Provide at least one of increasePct or decreasePct.',
                    }),
                requiresAuth: true,
                handler: async (args, ctx) => this.create(args, ctx),
            },
            {
                name: 'update_price_alert',
                description:
                    'Update an existing price alert. Pass null for a threshold to clear it (Premium only - free users must keep exactly one direction). isActive toggles enable/disable without deleting. Requires IWMM_API_KEY.',
                inputSchema: z.object({
                    id: z.coerce.number().int().describe('Alert ID from list_price_alerts.'),
                    increasePct: z.number().min(0.01).nullable().optional(),
                    decreasePct: z.number().min(0.01).nullable().optional(),
                    isActive: z.boolean().optional(),
                }),
                requiresAuth: true,
                handler: async (args, ctx) => this.update(args, ctx),
            },
            {
                name: 'delete_price_alert',
                description: 'Delete a price alert by ID. Requires IWMM_API_KEY.',
                inputSchema: z.object({ id: z.coerce.number().int() }),
                requiresAuth: true,
                handler: async (args, ctx) => this.remove(args, ctx),
            },
        ];
    }

    private async list(ctx: McpToolContext): Promise<unknown> {
        const [alerts, total] = await Promise.all([
            this.priceAlertService.findByUserWithCardData(ctx.user.id, 1, 20),
            this.priceAlertService.countByUser(ctx.user.id),
        ]);
        return ApiResponseDto.ok(
            alerts.map(PriceAlertApiPresenter.toAlertWithCardDto),
            new PaginationMeta(1, 20, total)
        );
    }

    private async create(
        args: { cardId: string; increasePct?: number; decreasePct?: number },
        ctx: McpToolContext
    ): Promise<unknown> {
        const alert = await this.priceAlertService.create(
            new PriceAlert({
                userId: ctx.user.id,
                cardId: args.cardId,
                increasePct: args.increasePct,
                decreasePct: args.decreasePct,
            })
        );
        return ApiResponseDto.ok(PriceAlertApiPresenter.toAlertDto(alert));
    }

    private async update(
        args: { id: number } & Record<string, unknown>,
        ctx: McpToolContext
    ): Promise<unknown> {
        const { id, ...patch } = args;
        const alert = await this.priceAlertService.update(id, ctx.user.id, patch as never);
        return ApiResponseDto.ok(PriceAlertApiPresenter.toAlertDto(alert));
    }

    private async remove(args: { id: number }, ctx: McpToolContext): Promise<unknown> {
        await this.priceAlertService.delete(args.id, ctx.user.id);
        return ApiResponseDto.ok({ deleted: true });
    }
}
