import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InsertResult, Repository } from 'typeorm';
import { CollectionEntity } from './collection.entity';
import { CollectionRepositoryPort } from 'src/core/collection/ports/collection.repository.port';
import { Collection } from 'src/core/collection/collection';
import { Card } from 'src/core/card/card';
import { User } from 'src/core/user/user';
import { UserEntity } from '../user/user.entity';

@Injectable()
export class CollectionRepository implements CollectionRepositoryPort {

    constructor(
        @InjectRepository(CollectionEntity)
        private readonly collectionRepository: Repository<CollectionEntity>,
    ) { }

    async saveCollection(collection: Collection, hashedPassword: string): Promise<Collection> {
        const entity = this.mapToEntity(collection, hashedPassword);
        const savedEntity = await this.collectionRepository.save(entity);
        return this.mapFromEntity(savedEntity);
    }

    async findByCollectionOwner(user: User): Promise<Collection | null> {
        const foundEntity = await this.collectionRepository.findOneBy({ owner: user });
        return this.mapFromEntity(foundEntity);
    }

    async addCard(card: Card): Promise<number> {
        const result: InsertResult = await this.collectionRepository.insert(card);
        return result.identifiers[0].id;
    }

    async addCards(cards: Card[]): Promise<number[]> {
        return (await this.collectionRepository.insert(cards)).identifiers.map(i => i.id);
    }

    async removeCard(card: Card, collection: Collection): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async removeCards(cards: Card[], collection: Collection): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async findById(id: number): Promise<Collection | null> {
        const collectionEntity = await this.collectionRepository.findOneBy({ id });
        return this.mapFromEntity(collectionEntity)
    }

    async collectionExists(user: User): Promise<boolean> {
        return await this.collectionRepository.exists({ where: { owner: user } });
    }

    async removeById(id: number): Promise<void> {
        await this.collectionRepository.delete(id);
    }

    async removeCollection(collection: Collection): Promise<void> {
        await this.collectionRepository.delete(collection.id);
    }

    async save(collection: Collection, hashedPassword: string): Promise<Collection> {
        const collectionEntity = this.mapToEntity(collection, hashedPassword);
        const savedCollectionEntity = await this.collectionRepository.save(collectionEntity);
        return this.mapFromEntity(savedCollectionEntity);
    }

    private mapToEntity(collection: Collection, hashedPassword: string): CollectionEntity {
        const collectionEntity = new CollectionEntity();
        collectionEntity.id = collection.id;
        collectionEntity.cards = collection.cards;
        collectionEntity.owner = new UserEntity();
        collectionEntity.owner.password = hashedPassword;
        collectionEntity.owner.id = collection.owner.id;
        collectionEntity.owner.email = collection.owner.email;
        collectionEntity.owner.name = collection.owner.name;
        return collectionEntity;
    }

    private mapFromEntity(collectionEntity: CollectionEntity): Collection {
        const collection = new Collection();
        collection.cards = collectionEntity.cards;
        collection.id = collectionEntity.id;
        collection.owner = collectionEntity.owner;
        return collection
    }

}