import { Collection } from 'src/core/collection/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CollectionDto } from './dto/collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionMapper {

    // TODO: impl

    dtoToEntity(createCollectionDto: CreateCollectionDto): Collection {
        const collection = new Collection();

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
        return manaCost ? manaCost
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
}