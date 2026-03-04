import { Transaction } from './transaction.entity';

export const TransactionRepositoryPort = 'TransactionRepositoryPort';

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
     * Find all transactions for a user, ordered by date DESC
     */
    findByUser(userId: number): Promise<Transaction[]>;

    /**
     * Delete a transaction by ID
     */
    delete(id: number, userId: number): Promise<void>;
}
