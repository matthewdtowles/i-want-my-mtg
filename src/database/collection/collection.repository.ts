import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CollectionRepositoryPort } from "src/core/collection/ports/collection.repository.port";
import { Collection } from "src/core/collection/collection";
import { Repository } from "typeorm";
import { CollecitonEntity } from "./collection.entity";

@Injectable()
export class CollectionRepository implements CollectionRepositoryPort {
    
    constructor(
        @InjectRepository(CollectionEntity)
        private readonly collectionRepository: Repository<CollectionEntity>,
    ) {}

    async emailExists(_email: string): Promise<boolean> {
        return await this.collectionRepository.exists({where:{email: _email}});
    }
    
    async findById(id: number): Promise<Collection | null> {
        const collectionEntity = await this.collectionRepository.findOneBy({ id });
        return collectionEntity ? new Collection(collectionEntity.id, collectionEntity.name, collectionEntity.email) : null;
    }

    async findByEmail(collectionname: string): Promise<Collection | null> {
        const collectionEntity: CollectionEntity =  await this.collectionRepository.findOneBy({ name: collectionname });
        return collectionEntity ? new Collection(collectionEntity.id, collectionEntity.name, collectionEntity.email) : null;
    }

    async getPasswordHash(email: string): Promise<string> {
        const collectionEntity = await this.collectionRepository.findOneBy({ email });
        return collectionEntity ? collectionEntity.password : null;
    }

    async collectionExists(collection: Collection): Promise<boolean> {
        return await this.collectionRepository.exists({ where: { name: collection.name } });
    }

    async removeById(id: number): Promise<void> {
        await this.collectionRepository.delete(id);
    }

    async removeCollection(collection: Collection): Promise<void> {
        await this.collectionRepository.delete(collection.id);
    }

    async save(collection: Collection, hashedPassword: string): Promise<Collection> {
        const collectionEntity = new CollectionEntity();
        collectionEntity.id = collection.id;
        collectionEntity.name = collection.name;
        collectionEntity.email = collection.email;
        collectionEntity.password = hashedPassword;
        const savedCollectionEntity = await this.collectionRepository.save(collectionEntity);
        return new Collection(savedCollectionEntity.id, savedCollectionEntity.name, savedCollectionEntity.email);
    }
}