import { Inject, Injectable } from '@nestjs/common';
import { OptimizerPlan } from 'src/core/optimizer/optimizer.types';
import { SellOptimizerService } from 'src/core/optimizer/sell-optimizer.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { OptimizerViewDto } from './dto/optimizer.view.dto';

@Injectable()
export class SellOptimizerOrchestrator {
    private readonly LOGGER = getLogger(SellOptimizerOrchestrator.name);

    constructor(
        @Inject(SellOptimizerService) private readonly optimizerService: SellOptimizerService
    ) {
        this.LOGGER.debug('Initialized');
    }

    async buildView(req: AuthenticatedRequest, bonusParamRaw?: string): Promise<OptimizerViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const bonusPct = SellOptimizerService.parseBonus(bonusParamRaw);
            const plan = await this.optimizerService.buildPlan(req.user.id, bonusPct);

            return new OptimizerViewDto({
                authenticated: true,
                title: 'Cash vs. Store Credit - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Cash vs. Credit', url: '/optimizer' },
                ],
                vendorName: plan.vendorName,
                sellItemCount: plan.sellItemCount,
                itemsWithoutPrice: plan.itemsWithoutPrice,
                buyLines: plan.buyLines,
                defaultBonusPct: bonusPct,
                result: plan.result,
            });
        } catch (error) {
            this.LOGGER.debug(`Error building optimizer view: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildView');
        }
    }

    /** CSV of the plan for the given bonus. */
    async buildCsv(req: AuthenticatedRequest, bonusParamRaw?: string): Promise<string> {
        HttpErrorHandler.validateAuthenticatedRequest(req);
        const bonusPct = SellOptimizerService.parseBonus(bonusParamRaw);
        const plan = await this.optimizerService.buildPlan(req.user.id, bonusPct);
        return toCsv(plan);
    }
}

function csvField(v: string | number): string {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(plan: OptimizerPlan): string {
    const result = plan.result;
    const lines: string[] = [];
    lines.push('section,field,value');
    lines.push(`summary,vendor,${csvField(plan.vendorName)}`);
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
    for (const l of plan.buyLines) {
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
