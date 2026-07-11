import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Transaction, TransactionType } from '../transaction.entity';

export const TransactionRepositoryPort = 'TransactionRepositoryPort';

export interface CashFlowPeriod {
    period: string;
    totalBought: number;
    totalSold: number;
    net: number;
}

export interface TransactionRepositoryPort {
    /**
     * Save a transaction (insert or update)
     */
    save(transaction: Transaction): Promise<Transaction>;

    /**
     * Find a transaction by ID
     */
    findById(id: number): Promise<Transaction | null>;

    /**
     * Find all transactions for a user and card, optionally filtered by foil
     */
    findByUserAndCard(userId: number, cardId: string, isFoil?: boolean): Promise<Transaction[]>;

    /**
     * Find all BUY transactions for a user/card/foil combo, ordered by date ASC (for FIFO)
     */
    findBuyLots(userId: number, cardId: string, isFoil: boolean): Promise<Transaction[]>;

    /**
     * Find all SELL transactions for a user/card/foil combo, ordered by date ASC
     */
    findSells(userId: number, cardId: string, isFoil: boolean): Promise<Transaction[]>;

    /**
     * Sum BUY and SELL quantities for a user/card/foil combo in a single
     * aggregate query. Used by the remaining-quantity check on the hot money
     * path instead of loading the full lot history (W2/P2).
     */
    sumQuantities(
        userId: number,
        cardId: string,
        isFoil: boolean
    ): Promise<{ totalBought: number; totalSold: number }>;

    /**
     * Find all transactions for a user, ordered by date DESC.
     * Optional `sinceDate` caps results to transactions on or after that date
     * (used by the free-tier 30-day history gate).
     */
    findByUser(userId: number, sinceDate?: Date): Promise<Transaction[]>;

    /**
     * Update a transaction by ID (only updates provided fields)
     */
    update(id: number, userId: number, fields: Partial<Transaction>): Promise<Transaction>;

    /**
     * Delete a transaction by ID
     */
    delete(id: number, userId: number): Promise<void>;

    /**
     * Find transactions for a user with pagination, sorting, and filtering.
     * Optional `sinceDate` caps results to transactions on or after that date
     * (used by the free-tier 30-day history gate). Optional `type` restricts
     * results to BUY or SELL transactions.
     */
    findByUserPaginated(
        userId: number,
        options: SafeQueryOptions,
        sinceDate?: Date,
        type?: TransactionType
    ): Promise<Transaction[]>;

    /**
     * Count transactions for a user with the same filters.
     * Optional `sinceDate` matches the cap applied by `findByUserPaginated`.
     * Optional `type` restricts the count to BUY or SELL transactions.
     */
    countByUser(
        userId: number,
        options: SafeQueryOptions,
        sinceDate?: Date,
        type?: TransactionType
    ): Promise<number>;

    /**
     * Aggregate transaction amounts by month for cash flow analysis
     */
    getCashFlow(userId: number): Promise<CashFlowPeriod[]>;
}
