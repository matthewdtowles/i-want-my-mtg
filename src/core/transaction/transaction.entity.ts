import { validateInit } from 'src/core/validation.util';

/** The only valid transaction types. Single source for parsing and validation. */
export const TRANSACTION_TYPES = ['BUY', 'SELL'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Parse an untrusted value into a TransactionType, or undefined if it isn't one.
 * Trims and upper-cases so ` sell ` and `BUY` both resolve; anything else (typos,
 * non-strings) is undefined. The single gate used by the controllers, the MCP
 * tools, and the strict API validator so they can't disagree.
 */
export function parseTransactionType(value?: unknown): TransactionType | undefined {
    const upper = typeof value === 'string' ? value.trim().toUpperCase() : undefined;
    return TRANSACTION_TYPES.includes(upper as TransactionType)
        ? (upper as TransactionType)
        : undefined;
}

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
        validateInit(init, [
            'userId',
            'cardId',
            'type',
            'quantity',
            'pricePerUnit',
            'isFoil',
            'date',
        ]);
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
