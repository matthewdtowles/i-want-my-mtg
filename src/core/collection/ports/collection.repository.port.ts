import { User } from "src/core/user/user.entity";
import { Collection } from "../collection.entity";


export const CollectionRepositoryPort = 'CollectionRepositoryPort';

/**
 * Persistence layer for Collection entity
 */
export interface CollectionRepositoryPort {

    /**
     * Create collection, update if exists
     * 
     * @param collection
     * @returns created | updated collection
     */
    save(collection: Collection): Promise<Collection>;

    /**
     * @param id
     * @returns collection entity with id, null if not found
     */
    findById(id: number): Promise<Collection | null>;

    /**
     * @param collection
     * @returns user's collection, null if not found
     */
    findByUser(user: User): Promise<Collection | null>;

    /**
     * Remove collection entity
     * 
     * @param collection
     */
    delete(collection: Collection): Promise<void>;
}