import { BuyListItem } from '../buy-list-item.entity';

export const BuyListRepositoryPort = 'BuyListRepositoryPort';

/**
 * Persistence for the per-user buy-list (Phase 6.5). Natural key is
 * (userId, cardId, isFoil) — one row per card+finish per user.
 */
export interface BuyListRepositoryPort {
    /** All of a user's buy-list items, with card data, newest first. */
    findByUser(userId: number): Promise<BuyListItem[]>;

    /** A single item by its natural key, or null. */
    findOne(userId: number, cardId: string, isFoil: boolean): Promise<BuyListItem | null>;

    /**
     * Same lookup as {@link findOne} but takes a `SELECT ... FOR UPDATE` row
     * lock, serializing concurrent mutations to one item. Must be called
     * inside a transaction (see TransactionRunner).
     */
    findOneForUpdate(userId: number, cardId: string, isFoil: boolean): Promise<BuyListItem | null>;

    /** Set the absolute quantity, creating the row if absent. */
    save(item: BuyListItem): Promise<BuyListItem>;

    /**
     * Atomically add `delta` to the quantity, creating the row at `delta` if
     * absent (INSERT ... ON CONFLICT DO UPDATE). Returns the resulting quantity.
     */
    increment(userId: number, cardId: string, isFoil: boolean, delta: number): Promise<number>;

    /** Remove one item. */
    delete(userId: number, cardId: string, isFoil: boolean): Promise<void>;

    /** Remove all of a user's items. */
    clear(userId: number): Promise<void>;

    /** Count of a user's items. */
    countByUser(userId: number): Promise<number>;
}
