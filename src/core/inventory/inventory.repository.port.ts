import { BaseRepositoryPort } from 'src/core/base.repository.port';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Inventory } from './inventory.entity';

export const InventoryRepositoryPort = 'InventoryRepositoryPort';

/**
 * Persistence layer for inventory entity
 */
export interface InventoryRepositoryPort extends BaseRepositoryPort {
    /**
     * Create inventory entities, update if they exist
     *
     * @param inventoryItems
     * @returns saved inventory entities
     */
    save(inventoryItems: Inventory[]): Promise<Inventory[]>;

    /**
     * @param userId
     * @param cardId
     * @param isFoil
     * @returns user's single inventory entity matching cardId
     */
    findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null>;

    /**
     * This is used to find both foil and non-foil cards
     *
     * @param userId
     * @param cardId
     * @returns user's inventory entities matching cardId
     */
    findByCard(userId: number, cardId: string): Promise<Inventory[]>;

    /**
     * Find user inventory items in given set of card IDs
     *
     * @param userId
     * @param cardIds
     * @returns user's inventory entities matching card IDs
     */
    findByCards(userId: number, cardIds: string[]): Promise<Inventory[]>;

    /**
     * Find user inventory items with pagination
     *
     * @param {number} userId
     * @param {SafeQueryOptions} options safe pagination and filter options
     * @returns user's inventory entities for given page
     */
    findByUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]>;

    /**
     * Get total number of inventory items for user
     *
     * @param {number} userId
     * @param {SafeQueryOptions} options safe pagination and filter options
     * @returns total number of inventory items
     */
    totalInventoryCards(userId: number, options: SafeQueryOptions): Promise<number>;

    /**
     * @param {number} userId
     * @returns total value of user's inventory items
     */
    totalInventoryValue(userId: number): Promise<number>;

    /**
     * @param {number} userId
     * @param {string} setCode
     * @returns total value for user's inventory items in given set
     */
    totalInventoryValueForSet(userId: number, setCode: string): Promise<number>;

    /**
     * @param {number} userId
     * @param {string} setCode
     * @returns total number of cards in set owned by user
     */
    totalInventoryCardsForSet(userId: number, setCode: string): Promise<number>;

    /**
     * Delete inventory entity
     * Use when quantity is < 1
     *
     * @param userId user ID
     * @param cardId card ID - UUID
     * @param foil true if foil card, false otherwise
     */
    delete(userId: number, cardId: string, foil: boolean): Promise<void>;

    /**
     * Insert inventory rows, skipping any that already exist with quantity >= 1.
     * Uses INSERT ... ON CONFLICT (card_id, user_id, foil) DO NOTHING.
     *
     * Each item uses 3 SQL parameters; PostgreSQL supports up to 65535 parameters
     * per query, allowing up to ~21845 items per call. The current MAX_ROWS import
     * cap (2000 rows × 3 params = 6000) is well within this limit.
     *
     * @param items Array of items to insert
     * @returns Number of rows inserted and skipped
     */
    ensureAtLeastOne(
        items: Array<{ cardId: string; userId: number; isFoil: boolean }>
    ): Promise<{ saved: number; skipped: number }>;

    /**
     * Find all inventory items for a user, with card and price data, for export.
     *
     * @param userId user ID
     * @returns all inventory items for the user
     */
    findAllForExport(userId: number): Promise<Inventory[]>;
}
