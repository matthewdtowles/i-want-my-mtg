import { BaseRepositoryPort } from 'src/core/base.repository.port';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Card } from './card.entity';
import { Format } from './format.enum';

export const CardRepositoryPort = 'CardRepositoryPort';

/**
 * Persistence layer interface for Card entity.
 */
export interface CardRepositoryPort extends BaseRepositoryPort {
    /**
     * Saves an array of Card entities. Updates existing cards if they already exist.
     * @param cards Array of Card entities to save.
     * @returns Promise resolving to the number of saved cards.
     */
    save(cards: Card[]): Promise<number>;

    /**
     * Finds a Card entity by its unique identifier.
     * @param id Unique identifier of the card.
     * @param relations Array of relation names to load.
     * @returns Promise resolving to the Card entity, or null if not found.
     */
    findById(id: string, relations: string[]): Promise<Card | null>;

    /**
     * Finds all Card entities in a set by set code, with optional pagination and filtering.
     * @param code Unique three-letter set code (primary key).
     * @param options Query options for pagination and filtering.
     * @returns Promise resolving to an array of Card entities.
     */
    findBySet(code: string, options: SafeQueryOptions): Promise<Card[]>;

    /**
     * Finds all Card entities with a given name, with optional pagination and filtering.
     * @param name Name of the card to find.
     * @param options Query options for pagination and filtering.
     * @returns Promise resolving to an array of Card entities.
     */
    findWithName(name: string, options: SafeQueryOptions): Promise<Card[]>;

    /**
     * Finds a Card entity in a set by set code and card number.
     * @param code Set code.
     * @param number Card number in the set.
     * @param relations Array of relation names to load.
     * @returns Promise resolving to the Card entity, or null if not found.
     */
    findBySetCodeAndNumber(code: string, number: string, relations: string[]): Promise<Card | null>;

    /**
     * Gets the total number of cards with a given name.
     * @param name Name of the cards to count.
     * @returns Promise resolving to the total number of cards with the given name.
     */
    totalWithName(name: string): Promise<number>;

    /**
     * Verifies the existence of cards by their IDs.
     * @param ids Array of card IDs to verify.
     * @returns Promise resolving to a set of existing card IDs.
     */
    verifyCardsExist(ids: string[]): Promise<Set<string>>;

    /**
     * Deletes a Card entity by its unique identifier.
     * @param id Unique identifier of the card to delete.
     * @returns Promise resolving when the card is deleted.
     */
    delete(id: string): Promise<void>;

    /**
     * Deletes the legality of a card for a specific format.
     * @param cardId Unique identifier of the card.
     * @param format Format for which the legality is to be removed.
     * @returns Promise resolving when the legality is deleted.
     */
    deleteLegality(cardId: string, format: Format): Promise<void>;
}
