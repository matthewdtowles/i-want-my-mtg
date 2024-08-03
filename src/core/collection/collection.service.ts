import { Injectable } from '@nestjs/common';
import { CollectionServicePort } from './ports/collection.service.port';
import { Card } from '../card/card';
import { Collection } from './collection.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionRepository } from './ports/collection.repository';

@Injectable()
export class CollectionService implements CollectionServicePort {

    constructor(@InjectRepository(CollectionRepository) private readonly repository: CollectionRepository) {}

    create(collection: Collection): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    findById(id: string): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    findByUser(user: string, number: number): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    addCard(collection: Collection, card: Card): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    addCards(collection: Collection, cards: Card[]): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    removeCard(collection: Collection, card: Card): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    removeCards(collection: Collection, cards: Card[]): Promise<Collection> {
        throw new Error('Method not implemented.');
    }

    update(collection: Collection): Promise<Collection> {
        throw new Error('Method not implemented.');
    }
}
