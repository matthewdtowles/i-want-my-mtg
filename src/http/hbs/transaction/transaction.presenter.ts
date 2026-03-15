import { EDIT_WINDOW_MS } from 'src/core/transaction/transaction.constants';
import { Transaction, TransactionType } from 'src/core/transaction/transaction.entity';
import { CostBasisSummary } from 'src/core/transaction/transaction.service';
import { formatUtcDate } from 'src/http/base/date.util';
import { buildCardUrl, formatGain, formatRoi, gainSign, toDollar } from 'src/http/base/http.util';
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
        cardSetCode?: string,
        cardNumber?: string
    ): TransactionResponseDto {
        const total = transaction.quantity * transaction.pricePerUnit;
        const setCode = cardSetCode || '';
        return new TransactionResponseDto({
            id: transaction.id,
            cardId: transaction.cardId,
            cardName: cardName || '',
            cardSetCode: setCode,
            cardUrl: setCode && cardNumber ? buildCardUrl(setCode, cardNumber) : '',
            type: transaction.type,
            quantity: transaction.quantity,
            pricePerUnit: toDollar(transaction.pricePerUnit),
            rawPricePerUnit: transaction.pricePerUnit,
            totalPrice: toDollar(total),
            isFoil: transaction.isFoil,
            date: TransactionPresenter.formatDate(transaction.date),
            source: transaction.source || '',
            fees:
                transaction.fees != null
                    ? transaction.fees === 0
                        ? '$0.00'
                        : toDollar(transaction.fees)
                    : '',
            rawFees: transaction.fees ?? 0,
            notes: transaction.notes || '',
            editable: TransactionPresenter.isEditable(transaction.createdAt),
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
        return formatUtcDate(date);
    }

    static formatGain(amount: number): string {
        return formatGain(amount);
    }

    static formatRoi(percentage: number): string {
        return formatRoi(percentage);
    }

    static gainSign(amount: number): string {
        return gainSign(amount);
    }

    /**
     * Mitigate CSV formula injection for spreadsheet apps.
     * Only prefixes dangerous leading characters; CSV quoting/escaping
     * is handled by csv-stringify.
     */
    static escapeCsvField(value: string): string {
        if (/^[\s\x00-\x1f]*[=+\-@]/.test(value)) {
            return "'" + value;
        }
        return value;
    }

    static isEditable(createdAt?: Date | string): boolean {
        if (!createdAt) return false;
        const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
        if (isNaN(created.getTime())) return false;
        return Date.now() - created.getTime() < EDIT_WINDOW_MS;
    }
}
