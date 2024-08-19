import { Collection } from 'src/core/collection/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CollectionDto } from './dto/collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionMapper {

    dtoToEntity(createCollectionDto: CreateCollectionDto): Collection {
        const collection = new Collection();
        // collection.cards = createCollectionDto
        // TODO:
        // collection.set = createCollectionDto.setCode;
        return collection;
    }

    entityToDto(collection: Collection): CollectionDto {
        const collectionDto = new CollectionDto();
     
        return collectionDto;
    }

    updateDtoToEntity(updateCollectionDto: UpdateCollectionDto): Collection {
        const collection = new Collection();
        
        return collection;
    }

    private mapManaToView(manaCost: string): string[] {
        return null !== manaCost ? manaCost.toLowerCase()
        .toLowerCase()
        .trim()
        .replaceAll('/', '')
        .replace('{', '')
        .replaceAll('}', '')
        .split('{') : null;
    }

    private mapManaToRepo(manaCost: string[]): string {
        return null;
    }

    /*
    
       // TODO: move to CollectionMapper in core
    private mapToEntity(collection: Collection): CollectionEntity {
        const collectionEntity: CollectionEntity = new CollectionEntity();
        collectionEntity.id = collection.id;
        collectionEntity.imgSrc = collection.imgSrc;
        collectionEntity.isReserved = collection.isReserved;
        collectionEntity.manaCost = collection.manaCost;
        collectionEntity.name = collection.name;
        collectionEntity.number = collection.number;
        collectionEntity.originalText = collection.originalText;
        collectionEntity.rarity = collection.rarity;
        collectionEntity.set = collection.set;
        collectionEntity.url = collection.url;
        collectionEntity.uuid = collection.uuid;
        return collectionEntity;
    }

    // TODO: move to CollectionMapper in core
    private mapFromEntity(collectionEntity: CollectionEntity): Collection {
        const collection: CollectionEntity = new CollectionEntity();
        collection.id = collectionEntity.id;
        collection.imgSrc = collectionEntity.imgSrc;
        collection.isReserved = collectionEntity.isReserved;
        collection.manaCost = collectionEntity.manaCost;
        collection.name = collectionEntity.name;
        collection.number = collectionEntity.number;
        collection.originalText = collectionEntity.originalText;
        collection.rarity = collectionEntity.rarity;
        collection.set = collectionEntity.set;
        collection.url = collectionEntity.url;
        collection.uuid = collectionEntity.uuid;
        return collection;
    }
    
    */
}