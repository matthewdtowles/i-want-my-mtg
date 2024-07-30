import { InsertResult, Repository } from "typeorm";
import { Collection } from "../collection.entity";
import { User } from "src/core/users/user.entity";
import { Card } from "src/core/card/card.entity";

/**
 * Persistence layer for Collection entity
 */
export class CollectionRepository extends Repository<Collection> {

    // TODO: To be designed along with entity. User as lookup for collection??


    /**
     * Create collection entity, update if entity exists
     * 
     * @param collection
     * @returns created|updated collection
     */
    async saveCollection(collection: Collection): Promise<Collection> {
        return await this.save(collection);
    }

    /**
     * @param collection 
     * @returns true if collection entity exists, false otherwise
     */
    async collectionExists(user: User): Promise<boolean> {
        return await this.exists({ where: { owner: user }});
    }

    /**
     * @param id
     * @returns collection entity with id, null if not found
     */
    async findById(id: number): Promise<Collection | null> {
        return await this.findOneBy({ id: id });
    }

    /**
     * @param collectionname
     * @returns owner's collection, null if not found
     */
    async findByCollectionOwner(user: User): Promise<Collection | null> {
        return await this.findOneBy({ owner: user });
    }

    /**
     * Add card to collection
     * 
     * @param card 
     * @returns PK id of added card in collection
     */
    async addCard(card: Card): Promise<number> {
        const result: InsertResult = await this.insert(card);
        return result.identifiers[0].id;
    }

    /**
     * Add many cards to collection
     * 
     * @param cards 
     * @returns PK ids for each added card in collection
     */
    async addCards(cards: Card[]): Promise<number[]> {
        return (await this.insert(cards)).identifiers.map(i => i.id);
    }

    /**
     * Remove card from collection
     * 
     * @param card 
     * @param collection // TODO: pass user instead?
     */
    async removeCard(card: Card, collection: Collection): Promise<void> {
        // TODO: how to do this?
    }

    /**
     * Remove cards from collection
     * 
     * @param cards
     * @param collection // TODO: pass user instead?
     */
    async removeCards(cards: Card[], collection: Collection): Promise<void> {
        // TODO: how to do this?
    }

    /**
     * Remove collection entity with id
     * 
     * @param id
     */
    async removeById(id: number): Promise <void> {
        await this.delete(id);
    }

    /**
     * Remove collection entity
     * 
     * @param collection
     */
    async removeCollection(collection: Collection): Promise<void> {
        await this.delete(collection.id);
    }
}