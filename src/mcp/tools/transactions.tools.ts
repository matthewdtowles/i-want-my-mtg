import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { freeTierHistoryCutoff } from 'src/core/billing/subscription-limits';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { parseTransactionType } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { TransactionApiPresenter } from 'src/http/api/transaction/transaction-api.presenter';
import { TransactionPresenter } from 'src/http/hbs/transaction/transaction.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';

const transactionCreate = z.object({
    cardId: z.string().uuid().describe('Internal IWMM card UUID.'),
    type: z.enum(['BUY', 'SELL']),
    quantity: z.number().int().min(1),
    pricePerUnit: z.number().min(0).describe('Per-unit price in USD.'),
    isFoil: z.boolean(),
    date: z.string().date().describe('ISO 8601 date (YYYY-MM-DD).'),
    source: z
        .string()
        .optional()
        .describe("Where the transaction happened (e.g. 'TCGPlayer', 'LGS')."),
    fees: z.number().min(0).optional(),
    notes: z.string().optional(),
    skipInventorySync: z
        .boolean()
        .optional()
        .describe(
            'If true, record the transaction without adjusting inventory. Default false - transactions normally update inventory.'
        ),
});

const transactionUpdate = z.object({
    quantity: z.number().int().min(1).optional(),
    pricePerUnit: z.number().min(0).optional(),
    date: z.string().date().optional(),
    source: z.string().optional(),
    fees: z.number().min(0).optional(),
    notes: z.string().optional(),
});

/** Authenticated transaction tools, mirroring `TransactionApiController`. */
@Injectable()
export class TransactionMcpTools {
    constructor(
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'list_transactions',
                description:
                    "List the authenticated user's transactions, paginated. Supports sort/filter query params. Free tier sees the last 30 days only; Premium gets full history. Requires IWMM_API_KEY.",
                inputSchema: z.object({
                    page: z.number().int().min(1).optional(),
                    limit: z.number().int().min(1).max(100).optional(),
                    sort: z
                        .string()
                        .optional()
                        .describe('Sort key (e.g. TX_DATE, TX_TYPE, TX_CARD, TX_PRICE).'),
                    ascend: z
                        .boolean()
                        .optional()
                        .describe('Sort ascending. Defaults to descending (most recent first).'),
                    filter: z.string().optional().describe('Substring filter on card name.'),
                    type: z
                        .preprocess(
                            (v) => (typeof v === 'string' ? v.toUpperCase() : v),
                            z.enum(['BUY', 'SELL'])
                        )
                        .optional()
                        .describe(
                            'Filter to BUY or SELL transactions (case-insensitive). Omit for both.'
                        ),
                }),
                requiresAuth: true,
                handler: async (args, ctx) => this.list(args, ctx),
            },
            {
                name: 'record_transaction',
                description:
                    'Record a buy or sell transaction. By default this also adjusts inventory (BUY adds, SELL subtracts). This is a real write. Requires IWMM_API_KEY.',
                inputSchema: transactionCreate,
                requiresAuth: true,
                handler: async (args, ctx) => this.create(args, ctx),
            },
            {
                name: 'update_transaction',
                description:
                    'Update an existing transaction by ID. Only the fields supplied are changed. Card identity and type (BUY/SELL) cannot be changed via this endpoint - delete and re-create instead. Requires IWMM_API_KEY.',
                inputSchema: z.object({
                    id: z.number().int().min(1).describe('Transaction ID from list_transactions.'),
                    patch: transactionUpdate,
                }),
                requiresAuth: true,
                handler: async (args, ctx) => this.update(args, ctx),
            },
            {
                name: 'delete_transaction',
                description: 'Delete a transaction by ID. Requires IWMM_API_KEY.',
                inputSchema: z.object({ id: z.number().int().min(1) }),
                requiresAuth: true,
                handler: async (args, ctx) => this.remove(args, ctx),
            },
            {
                name: 'get_cost_basis',
                description:
                    'Get FIFO cost basis for a specific card+finish for the authenticated user. Pass either cardId or (setCode, setNumber). Requires IWMM_API_KEY.',
                inputSchema: z
                    .object({
                        cardId: z.string().uuid().optional(),
                        setCode: z.string().optional(),
                        setNumber: z.string().optional(),
                        isFoil: z.boolean().default(false),
                    })
                    .refine((v) => !!v.cardId || (!!v.setCode && !!v.setNumber), {
                        message: 'Provide either cardId, or both setCode and setNumber.',
                    }),
                requiresAuth: true,
                handler: async (args, ctx) => this.costBasis(args, ctx),
            },
        ];
    }

    private async list(args: Record<string, unknown>, ctx: McpToolContext): Promise<unknown> {
        const options = new SafeQueryOptions(this.toQuery(args));
        const type = parseTransactionType(args.type as string | undefined);
        const subscribed = await this.subscriptionService.isUserSubscribed(ctx.user.id);
        const sinceDate = subscribed ? undefined : freeTierHistoryCutoff();
        const [transactions, total] = await Promise.all([
            this.transactionService.findByUserPaginated(ctx.user.id, options, sinceDate, type),
            this.transactionService.countByUser(ctx.user.id, options, sinceDate, type),
        ]);
        return ApiResponseDto.ok(
            transactions.map((t) => TransactionApiPresenter.toTransactionItem(t)),
            new PaginationMeta(options.page, options.limit, total)
        );
    }

    private async create(
        args: z.infer<typeof transactionCreate>,
        ctx: McpToolContext
    ): Promise<unknown> {
        const entity = TransactionPresenter.toEntity(args as never, ctx.user.id);
        const saved = await this.transactionService.create(entity, {
            skipInventorySync: args.skipInventorySync,
        });
        return ApiResponseDto.ok(TransactionApiPresenter.toTransactionItem(saved));
    }

    private async update(
        args: { id: number; patch: z.infer<typeof transactionUpdate> },
        ctx: McpToolContext
    ): Promise<unknown> {
        const patch = args.patch ?? {};
        const fields: Record<string, unknown> = {};
        if (patch.quantity !== undefined) fields.quantity = patch.quantity;
        if (patch.pricePerUnit !== undefined) fields.pricePerUnit = patch.pricePerUnit;
        if (patch.date !== undefined) fields.date = new Date(patch.date);
        if (patch.source !== undefined) fields.source = patch.source;
        if (patch.fees !== undefined) fields.fees = patch.fees;
        if (patch.notes !== undefined) fields.notes = patch.notes;

        const { updated } = await this.transactionService.update(args.id, ctx.user.id, fields);
        return ApiResponseDto.ok(TransactionApiPresenter.toTransactionItem(updated));
    }

    private async remove(args: { id: number }, ctx: McpToolContext): Promise<unknown> {
        await this.transactionService.delete(args.id, ctx.user.id);
        return ApiResponseDto.ok({ deleted: true });
    }

    private async costBasis(
        args: { cardId?: string; setCode?: string; setNumber?: string; isFoil: boolean },
        ctx: McpToolContext
    ): Promise<unknown> {
        let cardId = args.cardId;
        if (!cardId) {
            const card = await this.cardService.findBySetCodeAndNumber(
                args.setCode?.trim().toLowerCase(),
                args.setNumber
            );
            if (!card) {
                throw new NotFoundException('Card not found');
            }
            cardId = card.id;
        }

        const cards = await this.cardService.findByIdsWithPrices([cardId]);
        const latestPrice = cards?.[0]?.prices?.[0];
        const marketPrice = args.isFoil
            ? latestPrice?.foil != null
                ? Number(latestPrice.foil)
                : 0
            : latestPrice?.normal != null
              ? Number(latestPrice.normal)
              : 0;

        const summary = await this.transactionService.getCostBasis(
            ctx.user.id,
            cardId,
            args.isFoil,
            marketPrice
        );
        return ApiResponseDto.ok({
            totalCost: summary.totalCost,
            totalQuantity: summary.totalQuantity,
            averageCost: summary.averageCost,
            unrealizedGain: summary.unrealizedGain,
            realizedGain: summary.realizedGain,
        });
    }

    private toQuery(args: Record<string, unknown>): Record<string, string> {
        const query: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) query[key] = String(value);
        }
        return query;
    }
}
