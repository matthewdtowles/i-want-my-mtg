import { User } from "src/core/user/user";
import { Collection } from "../collection";
import { Card } from "src/core/card/card";

/**
 * Persistence layer for Collection entity
 */
export interface CollectionRepositoryPort {

    /**
     * Create collection entity, update if entity exists
     * 
     * @param collection
     * @param hashedPassword
     * @returns created|updated collection
     */
    saveCollection(collection: Collection, hashedPassword: string): Promise<Collection>;

    /**
     * @param collection 
     * @returns true if collection entity exists, false otherwise
     */
    collectionExists(user: User): Promise<boolean>;

    /**
     * @param id
     * @returns collection entity with id, null if not found
     */
    findById(id: number): Promise<Collection | null>;

    /**
     * @param collection
     * @returns owner's collection, null if not found
     */
    findByCollectionOwner(user: User): Promise<Collection | null>;

    /**
     * Add card to collection
     * 
     * @param card 
     * @returns PK id of added card in collection
     */
    addCard(card: Card): Promise<number>;

    /**
     * Add many cards to collection
     * 
     * @param cards 
     * @returns PK ids for each added card in collection
     */
    addCards(cards: Card[]): Promise<number[]>;

    /**
     * Remove card from collection
     * 
     * @param card 
     * @param collection // TODO: pass collection instead?
     */
    removeCard(card: Card, collection: Collection): Promise<void>;

    /**
     * Remove cards from collection
     * 
     * @param cards
     * @param collection // TODO: pass collection instead?
     */
    removeCards(cards: Card[], collection: Collection): Promise<void>;

    /**
     * Remove collection entity with id
     * 
     * @param id
     */
    removeById(id: number): Promise <void>;

    /**
     * Remove collection entity
     * 
     * @param collection
     */
    removeCollection(collection: Collection): Promise<void>;
}