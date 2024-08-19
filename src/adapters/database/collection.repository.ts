import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionRepositoryPort } from 'src/core/collection/ports/collection.repository.port';
import { Collection } from 'src/core/collection/collection.entity';
import { User } from '../../core/user/user.entity';

@Injectable()
export class CollectionRepository implements CollectionRepositoryPort {

    constructor(
        @InjectRepository(Collection)
        private readonly collectionRepository: Repository<Collection>,
    ) { }

    async save(collection: Collection): Promise<Collection> {
        return await this.collectionRepository.save(collection);
    }

    async findById(_id: number): Promise<Collection | null> {
        return await this.collectionRepository.findOne({ 
            where: {
                id: _id,
            },
            relations: ['user', 'cards'], 
        });
    }

    async findByUser(user: User): Promise<Collection | null> {
        return await this.collectionRepository.findOne({
            where: {
                owner: user
            },
            relations: ['cards']
        });
    }

    async delete(collection: Collection): Promise<void> {
        await this.collectionRepository.delete(collection);
    }

    /* EXAMPLE ADD RELATIONSHIP - USER OWNS ROLE
const userRepository = getRepository(User);
const roleRepository = getRepository(Role);

const user = await userRepository.findOne(userId, { relations: ['roles'] });
const role = await roleRepository.findOne(roleId);

if (user && role) {
    user.roles.push(role); // Add the role
    await userRepository.save(user); // Save the user with the new role
}      */

    // TODO: move to CollectionMapper
    private mapToEntity(collection: Collection): Collection {
        if (null === collection || undefined === collection) {
            return null;
        }
        const collectionEntity = new Collection();
        collectionEntity.id = collection.id;
        collectionEntity.cards = collection.cards;
        collectionEntity.owner = new User();
        collectionEntity.owner.id = collection.owner.id;
        collectionEntity.owner.email = collection.owner.email;
        collectionEntity.owner.name = collection.owner.name;
        return collectionEntity;
    }
    // TODO: move to CollectionMapper
    private mapFromEntity(collectionEntity: Collection): Collection {
        if (null === collectionEntity || undefined === collectionEntity) {
            return null;
        }
        const collection = new Collection();
        collection.cards = collectionEntity.cards;
        collection.id = collectionEntity.id;
        collection.owner = collectionEntity.owner;
        return collection
    }

}