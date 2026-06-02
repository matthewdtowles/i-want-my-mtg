import { z } from 'zod';

/**
 * Output schemas for every MCP tool, mirroring the REST `*-response.dto.ts`
 * shapes each handler returns inside the `ApiResponseDto` envelope. Surfaced as
 * `outputSchema` in `tools/list` so clients can reason about results before
 * calling. Keyed by tool name; `mcp-tools.spec.ts` asserts the keys stay in sync
 * with the registry, so a renamed or new tool fails the build until its schema
 * lands here.
 */

const num = z.number();
const str = z.string();

/** ApiResponseDto envelope around a single payload. */
const ok = (data: z.ZodTypeAny): z.ZodTypeAny =>
    z.object({
        success: z.boolean(),
        data,
        message: str.optional(),
        error: str.optional(),
    });

/** ApiResponseDto envelope around a paginated array payload. */
const okPaginated = (item: z.ZodTypeAny): z.ZodTypeAny =>
    z.object({
        success: z.boolean(),
        data: z.array(item),
        meta: z
            .object({
                page: num,
                limit: num,
                total: num,
                totalPages: num,
                multiSetBlockKeys: z.array(str).optional(),
            })
            .optional(),
        error: str.optional(),
    });

const ack = (key: string): z.ZodTypeAny => ok(z.object({ [key]: z.boolean() }));

// ---- Entity shapes (mirror the API response DTOs) ----

const cardPrice = z.object({
    normal: num.nullable().optional(),
    foil: num.nullable().optional(),
    normalChangeWeekly: num.nullable().optional(),
    foilChangeWeekly: num.nullable().optional(),
});

const card = z.object({
    id: str,
    name: str,
    setCode: str,
    number: str,
    type: str,
    rarity: str,
    manaCost: str.optional(),
    oracleText: str.optional(),
    artist: str.optional(),
    flavorName: str.optional(),
    imgSrc: str,
    hasFoil: z.boolean(),
    hasNonFoil: z.boolean(),
    prices: cardPrice.optional(),
    setName: str.optional(),
    keyruneCode: str.optional(),
    purchaseUrlTcgplayer: str.optional(),
    purchaseUrlTcgplayerEtched: str.optional(),
});

const pricePoint = z.object({ date: str, normal: num.nullable(), foil: num.nullable() });

const set = z.object({
    code: str,
    name: str,
    type: str,
    releaseDate: str,
    baseSize: num,
    totalSize: num,
    keyruneCode: str,
    block: str.optional(),
    parentCode: str.optional(),
    isMain: z.boolean(),
    tags: z.array(str),
    prices: z
        .object({
            basePrice: num.nullable().optional(),
            totalPrice: num.nullable().optional(),
            basePriceAll: num.nullable().optional(),
            totalPriceAll: num.nullable().optional(),
            basePriceChangeWeekly: num.nullable().optional(),
            totalPriceChangeWeekly: num.nullable().optional(),
        })
        .optional(),
    ownedTotal: num.optional(),
    ownedValue: num.optional(),
    completionRate: num.optional(),
});

const sealedProduct = z.object({
    uuid: str,
    name: str,
    setCode: str,
    category: str.optional(),
    subtype: str.optional(),
    cardCount: num.optional(),
    productSize: num.optional(),
    releaseDate: str.optional(),
    contentsSummary: str.optional(),
    purchaseUrlTcgplayer: str.optional(),
    tcgplayerProductId: str.optional(),
    ownedQuantity: num.optional(),
});

const inventoryItem = z.object({
    cardId: str,
    quantity: num,
    isFoil: z.boolean(),
    cardName: str.optional(),
    setCode: str.optional(),
    cardNumber: str.optional(),
    imgSrc: str.optional(),
    rarity: str.optional(),
    keyruneCode: str.optional(),
    priceNormal: num.optional(),
    priceFoil: num.optional(),
    tags: z.array(str).optional(),
    hasNonFoil: z.boolean().optional(),
    hasFoil: z.boolean().optional(),
    url: str.optional(),
});

const quantity = z.object({ cardId: str, foilQuantity: num, normalQuantity: num });

const transaction = z.object({
    id: num,
    cardId: str,
    type: str,
    quantity: num,
    pricePerUnit: num,
    isFoil: z.boolean(),
    date: str,
    source: str.optional(),
    fees: num.optional(),
    notes: str.optional(),
    cardName: str.optional(),
    setCode: str.optional(),
    cardUrl: str.optional(),
    cardNumber: str.optional(),
    editable: z.boolean().optional(),
});

const costBasis = z.object({
    totalCost: num,
    totalQuantity: num,
    averageCost: num,
    unrealizedGain: num,
    realizedGain: num,
});

const alert = z.object({
    id: num,
    cardId: str,
    cardName: str.optional(),
    cardNumber: str.optional(),
    setCode: str.optional(),
    increasePct: num.nullable().optional(),
    decreasePct: num.nullable().optional(),
    isActive: z.boolean(),
    lastNotifiedAt: str.nullable().optional(),
    createdAt: str,
    updatedAt: str,
});

const notification = z.object({
    id: num,
    cardId: str,
    cardName: str.optional(),
    cardNumber: str.optional(),
    setCode: str.optional(),
    alertId: num.nullable().optional(),
    direction: str,
    oldPrice: num,
    newPrice: num,
    changePct: num,
    isRead: z.boolean(),
    createdAt: str,
});

const portfolioSummary = z.object({
    totalValue: num,
    totalCost: num,
    totalRealizedGain: num,
    totalCards: num,
    totalQuantity: num,
    computedAt: str,
});

const historyPoint = z.object({ date: str, totalValue: num, totalCost: num, totalCards: num });

const performanceItem = z.object({
    cardId: str,
    cardName: str.optional(),
    setCode: str.optional(),
    quantity: num,
    costBasis: num,
    currentValue: num,
    gain: num,
    roi: num,
});

const cashFlowPeriod = z.object({ period: str, totalBought: num, totalSold: num, net: num });

const breakdown = z.object({
    dimension: str,
    slices: z.array(
        z.object({ key: str, label: str, cardCount: num, itemCount: num, value: num })
    ),
    totalValue: num,
    totalItems: num,
});

/** Tool name -> result envelope schema. Asserted complete by the contract test. */
export const outputSchemaByName: Record<string, z.ZodTypeAny> = {
    // cards
    search_cards: okPaginated(card),
    get_card: ok(card),
    get_card_prices: ok(card),
    get_card_price_history: ok(z.array(pricePoint)),
    // sets
    search_sets: okPaginated(set),
    get_set: ok(set),
    list_set_cards: okPaginated(card),
    get_sealed_products: okPaginated(sealedProduct),
    // inventory
    list_inventory: okPaginated(inventoryItem),
    get_inventory_quantities: ok(z.array(quantity)),
    add_inventory: ok(z.array(inventoryItem)),
    update_inventory: ok(z.array(inventoryItem)),
    remove_inventory: ack('deleted'),
    // transactions
    list_transactions: okPaginated(transaction),
    record_transaction: ok(transaction),
    update_transaction: ok(transaction),
    delete_transaction: ack('deleted'),
    get_cost_basis: ok(costBasis),
    // portfolio
    get_portfolio_summary: ok(portfolioSummary.nullable()),
    get_portfolio_history: ok(z.array(historyPoint)),
    get_card_performance: ok(z.array(performanceItem)),
    get_cash_flow: ok(z.array(cashFlowPeriod)),
    get_realized_gains: ok(z.object({ totalRealizedGain: num })),
    get_portfolio_breakdown: ok(breakdown),
    refresh_portfolio: ack('refreshed'),
    // alerts
    list_price_alerts: okPaginated(alert),
    create_price_alert: ok(alert),
    update_price_alert: ok(alert),
    delete_price_alert: ack('deleted'),
    // notifications
    list_notifications: okPaginated(notification),
    get_unread_notification_count: ok(z.object({ count: num })),
    mark_notification_read: ack('markedRead'),
    mark_all_notifications_read: ack('markedAllRead'),
};
