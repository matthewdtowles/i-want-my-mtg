import { Set } from '../set.entity';
import { Repository } from 'typeorm';

/**
 * Persistence layer for Set entity
 */
export class SetRepository extends Repository<Set> {

    /**
     * Create set entity, update if entity exists
     * 
     * @param set
     */
    async saveSet(set: Set): Promise<Set> {
        return await this.save(set);
    }

    /**
     * @param set 
     * @returns true if set entity exists, false otherwise
     */
    async setExists(set: Set): Promise<boolean> {
        return await this.exists({ where: { setCode: set.setCode }});
    }

    /**
     * @param code 
     * @returns set entity with code, null if not found
     */
    async findByCode(code: string): Promise<Set | null> {
        return await this.findOneBy({ setCode: code });
    }

    /**
     * @param name 
     * @returns set entity with name, null if not found
     */
    async findByName(name: string): Promise<Set | null> {
        return await this.findOneBy({ name: name });
    }

    /**
     * @returns all sets with cards
     */
    async findAllSets(): Promise<Set[] | null> {
        // TODO: is this a valid use case? What gets returned by this.repository????
        return null;
    }

    /**
     * @returns all sets metadata without cards
     */
    async findAllSetsMeta(): Promise<Set[] | null> {
        // TODO: is this a valid use case? Can we return only metadata?
        return null;
    }

    //TODO: is this valid or will setCode be used as PK?
    /**
     * Remove set entity with id
     * 
     * @param id
     */
    async removeById(id: number): Promise <void> {
        await this.delete(id);
    }

    /**
     * Remove set entity
     * 
     * @param set
     */
    async removeSet(set: Set): Promise<void> {
        await this.delete(set.setCode);
    }

}