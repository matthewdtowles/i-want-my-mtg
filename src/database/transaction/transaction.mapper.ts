import { Transaction, TransactionType } from 'src/core/transaction/transaction.entity';
import { TransactionOrmEntity } from './transaction.orm-entity';

export class TransactionMapper {
    static toCore(orm: TransactionOrmEntity): Transaction {
        return {
            id: orm.id,
            userId: orm.userId,
            cardId: orm.cardId,
            type: orm.type as TransactionType,
            quantity: orm.quantity,
            pricePerUnit: Number(orm.pricePerUnit),
            isFoil: orm.isFoil,
            date: orm.date instanceof Date ? orm.date : new Date(orm.date),
            source: orm.source,
            fees: orm.fees != null ? Number(orm.fees) : undefined,
            notes: orm.notes,
            createdAt: orm.createdAt,
        };
    }

    static toOrmEntity(core: Transaction): TransactionOrmEntity {
        const orm = new TransactionOrmEntity();
        if (core.id != null) {
            orm.id = core.id;
        }
        orm.userId = core.userId;
        orm.cardId = core.cardId;
        orm.type = core.type;
        orm.quantity = core.quantity;
        orm.pricePerUnit = core.pricePerUnit;
        orm.isFoil = core.isFoil;
        orm.date = core.date;
        orm.source = core.source;
        orm.fees = core.fees;
        orm.notes = core.notes;
        return orm;
    }
}
