import { TransactionWithCard } from 'src/core/transaction/transaction-with-card.read-model';
import { TransactionPresenter } from 'src/http/hbs/transaction/transaction.presenter';
import { buildCardUrl } from 'src/http/base/http.util';
import { TransactionApiItemDto } from './dto/transaction-response.dto';

export class TransactionApiPresenter {
    static toTransactionItem(t: TransactionWithCard): TransactionApiItemDto {
        const cardName = t.cardName;
        const setCode = t.cardSetCode;
        const cardNumber = t.cardNumber;
        const cardUrl = setCode && cardNumber ? buildCardUrl(setCode, cardNumber) : undefined;

        return {
            id: t.id,
            cardId: t.cardId,
            type: t.type,
            quantity: t.quantity,
            pricePerUnit: t.pricePerUnit,
            isFoil: t.isFoil,
            date: TransactionPresenter.formatDate(t.date),
            source: t.source,
            fees: t.fees,
            notes: t.notes,
            cardName,
            setCode,
            cardUrl,
            cardNumber,
            editable: TransactionPresenter.isEditable(t.createdAt),
        };
    }
}
