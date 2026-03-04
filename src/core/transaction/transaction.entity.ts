import { validateInit } from 'src/core/validation.util';

export type TransactionType = 'BUY' | 'SELL';

export class Transaction {
    readonly id?: number;
    readonly userId: number;
    readonly cardId: string;
    readonly type: TransactionType;
    readonly quantity: number;
    readonly pricePerUnit: number;
    readonly isFoil: boolean;
    readonly date: Date;
    readonly source?: string;
    readonly fees?: number;
    readonly notes?: string;
    readonly createdAt?: Date;

    constructor(init: Partial<Transaction>) {
        validateInit(init, ['userId', 'cardId', 'type', 'quantity', 'pricePerUnit', 'isFoil', 'date']);
        this.id = init.id;
        this.userId = init.userId;
        this.cardId = init.cardId;
        this.type = init.type;
        this.quantity = init.quantity;
        this.pricePerUnit = init.pricePerUnit;
        this.isFoil = init.isFoil;
        this.date = init.date;
        this.source = init.source;
        this.fees = init.fees;
        this.notes = init.notes;
        this.createdAt = init.createdAt;
    }
}
