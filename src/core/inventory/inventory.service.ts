import { Inject, Injectable } from '@nestjs/common';
import { InventoryServicePort } from './ports/inventory.service.port';
import { Card } from '../card/card.entity';
import { Inventory } from './inventory.entity';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';

@Injectable()
export class InventoryService implements InventoryServicePort {

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort
    ) { }

    async create(inventory: Inventory): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async findById(id: string): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async findByUser(user: string, number: number): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async addCard(inventory: Inventory, card: Card): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async addCards(inventory: Inventory, cards: Card[]): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async removeCard(inventory: Inventory, card: Card): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async removeCards(inventory: Inventory, cards: Card[]): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }

    async update(inventory: Inventory): Promise<Inventory> {
        throw new Error('Method not implemented.');
    }
}
