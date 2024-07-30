import { InjectRepository } from '@nestjs/typeorm';
import { Card } from '../card.entity';
import { Repository } from 'typeorm';

/**
 * Persistence layer for Card entity
 */
export class CardRepository extends Repository<Card> {

    /**
     * Create card entity, update if entity exists
     * 
     * @param card
     * @returns created|updated card
     */
    async saveCard(card: Card): Promise<Card> {
        return await this.save(card);
    }

    /**
     * @param card 
     * @returns true if card entity exists, false otherwise
     */
    async cardExists(card: Card): Promise<boolean> {
        return await this.exists({ where: { uuid: card.uuid } });
    }

    /**
     * @param id 
     * @returns card entity with id, null if not found
     */
    async findById(id: number): Promise<Card | null> {
        return await this.findOneBy({ id: id });
    }

    /**
     * @param uuid 
     * @returns card entity with uuid, null if not found
     */
    async findByUuid(uuid: string): Promise<Card | null> {
        return await this.findOneBy({ uuid: uuid });
    }

    /**
     * @param code three letter set code
     * @param number card number in set
     * @returns card entity in set with code and card number in set
     */
    async findBySetCodeAndNumber(code: string, number: number): Promise<Card | null> {
        // TODO: figure this out
        // return await this.findBy({ set: code })
        return null;
    }

    /**
     * @param name 
     * @returns card entities with name
     */
    async findAllWithName(name: string): Promise<Card[] | null> {
        return await this.findBy({ name: name });
    }

    /**
     * @param code three letter set code
     * @returns card entities in set with code
     */
    async findAllInSet(code: string): Promise<Card[] | null> {
        // TODO: figure this out
        // return await this.findBy({ set: code });
        return null;
    }

    /**
     * Remove card entity with id
     * 
     * @param id
     */
    async removeById(id: number): Promise<void> {
        await this.delete(id);
    }

    /**
     * Remove card entity
     * 
     * @param card
     */
    async removeCard(card: Card): Promise<void> {
        await this.delete(card.id);
    }
}