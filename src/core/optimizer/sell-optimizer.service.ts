import { Inject, Injectable } from '@nestjs/common';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { computeCashVsCredit } from 'src/core/pricing/cash-vs-credit.policy';
import { DEFAULT_STORE_CREDIT_BONUS, vendorDisplayName } from 'src/core/pricing/vendor';
import { OptimizerBuyLine, OptimizerPlan } from './optimizer.types';

/** The single sell-to vendor today (see ROADMAP 6.9 — single-source). */
const VENDOR_KEY = 'cardkingdom';

/** Server clamp for the store-credit bonus; matches the optimizer UI input cap (200%). */
const MAX_BONUS = 2;

/**
 * Cash-vs-credit optimizer data (6.5), shared by the HBS page and the JSON API.
 * Gathers the user's sell plan (6.4) + buy list, prices the buy list, and runs
 * the pure cash-vs-credit policy — so both surfaces read the same backend.
 */
@Injectable()
export class SellOptimizerService {
    constructor(
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(BuyListService) private readonly buyListService: BuyListService
    ) {}

    /** Clamp a bonus query param (fraction, e.g. 0.3) to [0, 2]; default on bad input. */
    static parseBonus(raw?: string): number {
        if (raw === undefined || raw === '') return DEFAULT_STORE_CREDIT_BONUS;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return DEFAULT_STORE_CREDIT_BONUS;
        return Math.min(n, MAX_BONUS);
    }

    async buildPlan(userId: number, bonusPct: number): Promise<OptimizerPlan> {
        const [sellPlan, buyList] = await Promise.all([
            this.inventoryService.sellPlanForUser(userId),
            this.buyListService.list(userId),
        ]);

        const vendorGroup = sellPlan.groups.find((g) => g.provider === VENDOR_KEY);
        const cashValue = vendorGroup?.payout ?? 0;
        const sellItemCount = vendorGroup?.items.length ?? 0;

        let buyListRetail = 0;
        let itemsWithoutPrice = 0;
        const buyLines: OptimizerBuyLine[] = buyList.map((item) => {
            const price = item.card?.prices?.[0];
            const unit = item.isFoil ? price?.foil : price?.normal;
            const unitPrice = unit != null ? Number(unit) : null;
            const lineTotal = unitPrice != null ? unitPrice * item.quantity : null;
            if (lineTotal != null) buyListRetail += lineTotal;
            else itemsWithoutPrice++;
            return {
                name: item.card?.name ?? item.cardId,
                setCode: (item.card?.setCode ?? '').toUpperCase(),
                number: item.card?.number ?? '',
                finish: item.isFoil ? 'foil' : 'normal',
                quantity: item.quantity,
                unitPrice,
                lineTotal,
            };
        });

        const result = computeCashVsCredit({ cashValue, buyListRetail, bonusPct });

        return {
            vendorKey: VENDOR_KEY,
            vendorName: vendorDisplayName(VENDOR_KEY),
            cashValue,
            sellItemCount,
            buyListRetail,
            buyLines,
            itemsWithoutPrice,
            bonusPct,
            result,
        };
    }
}
