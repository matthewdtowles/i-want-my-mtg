import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { Repository } from 'typeorm';
import { User } from '../../core/user/user.entity';

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(
        @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
    ) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        return await this.inventoryRepository.save(inventoryItems);
    }

    async findByUser(_user: User): Promise<Inventory[]> {
        return await this.inventoryRepository.find({
            where: {
                user: _user
            },
            relations: ['cards']
        });
    }

    async delete(inventory: Inventory): Promise<void> {
        await this.inventoryRepository.delete(inventory);
    }
}