import { Transaction, TransactionType } from 'src/core/transaction/transaction.entity';
import { CostBasisSummary } from 'src/core/transaction/transaction.service';
import { toDollar } from 'src/http/base/http.util';
import { CostBasisResponseDto } from './dto/cost-basis.response.dto';
import { TransactionRequestDto } from './dto/transaction.request.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';

export class TransactionPresenter {
    static toEntity(dto: TransactionRequestDto, userId: number): Transaction {
        return new Transaction({
            userId,
            cardId: dto.cardId,
            type: dto.type as TransactionType,
            quantity: dto.quantity,
            pricePerUnit: dto.pricePerUnit,
            isFoil: dto.isFoil,
            date: new Date(dto.date),
            source: dto.source,
            fees: dto.fees,
            notes: dto.notes,
        });
    }

    static toResponseDto(
        transaction: Transaction,
        cardName?: string,
        cardSetCode?: string
    ): TransactionResponseDto {
        const total = transaction.quantity * transaction.pricePerUnit;
        const setCode = cardSetCode || '';
        return new TransactionResponseDto({
            id: transaction.id,
            cardId: transaction.cardId,
            cardName: cardName || '',
            cardSetCode: setCode,
            cardUrl: setCode ? `/card/${setCode.toLowerCase()}/${transaction.cardId}` : '',
            type: transaction.type,
            quantity: transaction.quantity,
            pricePerUnit: toDollar(transaction.pricePerUnit),
            totalPrice: toDollar(total),
            isFoil: transaction.isFoil,
            date: TransactionPresenter.formatDate(transaction.date),
            source: transaction.source || '',
            fees: transaction.fees ? toDollar(transaction.fees) : '',
            notes: transaction.notes || '',
        });
    }

    static toCostBasisResponse(
        summary: CostBasisSummary,
        currentMarketPrice: number
    ): CostBasisResponseDto {
        const currentValue = summary.totalQuantity * currentMarketPrice;
        const roi =
            summary.totalCost > 0
                ? ((currentValue - summary.totalCost) / summary.totalCost) * 100
                : 0;

        return new CostBasisResponseDto({
            totalCost: toDollar(summary.totalCost),
            totalQuantity: summary.totalQuantity,
            averageCost: toDollar(summary.averageCost),
            unrealizedGain: TransactionPresenter.formatGain(summary.unrealizedGain),
            unrealizedGainSign: TransactionPresenter.gainSign(summary.unrealizedGain),
            realizedGain: TransactionPresenter.formatGain(summary.realizedGain),
            realizedGainSign: TransactionPresenter.gainSign(summary.realizedGain),
            currentValue: toDollar(currentValue),
            roi: TransactionPresenter.formatRoi(roi),
            roiSign: TransactionPresenter.gainSign(roi),
            hasData: summary.totalQuantity > 0 || summary.realizedGain !== 0,
        });
    }

    static formatDate(date: Date): string {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static formatGain(amount: number): string {
        if (amount === 0) return '$0.00';
        const prefix = amount > 0 ? '+' : '-';
        return prefix + toDollar(Math.abs(amount));
    }

    static formatRoi(percentage: number): string {
        if (percentage === 0) return '0.0%';
        const prefix = percentage > 0 ? '+' : '-';
        return `${prefix}${Math.abs(percentage).toFixed(1)}%`;
    }

    static gainSign(amount: number): string {
        if (amount > 0) return 'positive';
        if (amount < 0) return 'negative';
        return 'neutral';
    }
}
