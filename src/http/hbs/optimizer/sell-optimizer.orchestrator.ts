import { Inject, Injectable } from '@nestjs/common';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { CashVsCreditResult, computeCashVsCredit } from 'src/core/pricing/cash-vs-credit.policy';
import { DEFAULT_STORE_CREDIT_BONUS, vendorDisplayName } from 'src/core/pricing/vendor';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { OptimizerBuyLine, OptimizerViewDto } from './dto/optimizer.view.dto';

/** The single sell-to vendor today (see ROADMAP 6.9 — single-source). */
const VENDOR_KEY = 'cardkingdom';

interface OptimizerData {
    vendorName: string;
    cashValue: number;
    sellItemCount: number;
    buyListRetail: number;
    buyLines: OptimizerBuyLine[];
    itemsWithoutPrice: number;
}

@Injectable()
export class SellOptimizerOrchestrator {
    private readonly LOGGER = getLogger(SellOptimizerOrchestrator.name);

    constructor(
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(BuyListService) private readonly buyListService: BuyListService
    ) {
        this.LOGGER.debug('Initialized');
    }

    /** Clamp a bonus query param (fraction, e.g. 0.3) to a sane range; default on bad input. */
    private parseBonus(raw?: string): number {
        if (raw === undefined || raw === '') return DEFAULT_STORE_CREDIT_BONUS;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return DEFAULT_STORE_CREDIT_BONUS;
        return Math.min(n, 2);
    }

    private async gather(userId: number): Promise<OptimizerData> {
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

        return {
            vendorName: vendorDisplayName(VENDOR_KEY),
            cashValue,
            sellItemCount,
            buyListRetail,
            buyLines,
            itemsWithoutPrice,
        };
    }

    async buildView(req: AuthenticatedRequest, bonusParamRaw?: string): Promise<OptimizerViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const bonusPct = this.parseBonus(bonusParamRaw);
            const data = await this.gather(req.user.id);
            const result = computeCashVsCredit({
                cashValue: data.cashValue,
                buyListRetail: data.buyListRetail,
                bonusPct,
            });

            return new OptimizerViewDto({
                authenticated: true,
                title: 'Cash vs. Store Credit - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Cash vs. Credit', url: '/optimizer' },
                ],
                vendorName: data.vendorName,
                sellItemCount: data.sellItemCount,
                itemsWithoutPrice: data.itemsWithoutPrice,
                buyLines: data.buyLines,
                defaultBonusPct: bonusPct,
                result,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building optimizer view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildView');
        }
    }

    /** CSV of the plan for the given bonus. */
    async buildCsv(req: AuthenticatedRequest, bonusParamRaw?: string): Promise<string> {
        HttpErrorHandler.validateAuthenticatedRequest(req);
        const bonusPct = this.parseBonus(bonusParamRaw);
        const data = await this.gather(req.user.id);
        const result = computeCashVsCredit({
            cashValue: data.cashValue,
            buyListRetail: data.buyListRetail,
            bonusPct,
        });
        return toCsv(data, result);
    }
}

function csvField(v: string | number): string {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(data: OptimizerData, result: CashVsCreditResult): string {
    const lines: string[] = [];
    lines.push('section,field,value');
    lines.push(`summary,vendor,${csvField(data.vendorName)}`);
    lines.push(`summary,sell_cash_value,${result.cashValue}`);
    lines.push(`summary,store_credit_bonus_pct,${Math.round(result.bonusPct * 100)}`);
    lines.push(`summary,store_credit,${result.storeCredit}`);
    lines.push(`summary,buy_list_retail,${result.buyListRetail}`);
    lines.push(`summary,recommendation,${result.recommendCredit ? 'store_credit' : 'cash'}`);
    lines.push(`summary,credit_advantage,${result.creditAdvantage}`);
    lines.push(`summary,cash_out_of_pocket,${result.cashOutOfPocket}`);
    lines.push(`summary,credit_out_of_pocket,${result.creditOutOfPocket}`);
    lines.push(`summary,locked_leftover_credit,${result.lockedCredit}`);
    lines.push('');
    lines.push('buy_list,name,set_code,number,finish,quantity,unit_retail,line_retail');
    for (const l of data.buyLines) {
        lines.push(
            [
                'buy_list',
                csvField(l.name),
                csvField(l.setCode),
                csvField(l.number),
                l.finish,
                l.quantity,
                l.unitPrice ?? '',
                l.lineTotal ?? '',
            ].join(',')
        );
    }
    return lines.join('\n') + '\n';
}
