import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { Repository } from 'typeorm';
import { User } from '../../core/user/user.entity';

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(
        @InjectRepository(Inventory)
        private readonly inventoryRepository: Repository<Inventory>,
    ) { }

    async save(inventory: Inventory): Promise<Inventory> {
        return await this.inventoryRepository.save(inventory);
    }

    async findById(_id: number): Promise<Inventory | null> {
        return await this.inventoryRepository.findOne({ 
            where: {
                id: _id,
            },
            relations: ['user', 'cards'], 
        });
    }

    async findByUser(user: User): Promise<Inventory | null> {
        return await this.inventoryRepository.findOne({
            where: {
                owner: user
            },
            relations: ['cards']
        });
    }

    async delete(inventory: Inventory): Promise<void> {
        await this.inventoryRepository.delete(inventory);
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

    // TODO: move to InventoryMapper
    private mapToEntity(inventory: Inventory): Inventory {
        if (null === inventory || undefined === inventory) {
            return null;
        }
        const inventoryEntity = new Inventory();
        inventoryEntity.id = inventory.id;
        inventoryEntity.cards = inventory.cards;
        inventoryEntity.owner = new User();
        inventoryEntity.owner.id = inventory.owner.id;
        inventoryEntity.owner.email = inventory.owner.email;
        inventoryEntity.owner.name = inventory.owner.name;
        return inventoryEntity;
    }
    // TODO: move to InventoryMapper
    private mapFromEntity(inventoryEntity: Inventory): Inventory {
        if (null === inventoryEntity || undefined === inventoryEntity) {
            return null;
        }
        const inventory = new Inventory();
        inventory.cards = inventoryEntity.cards;
        inventory.id = inventoryEntity.id;
        inventory.owner = inventoryEntity.owner;
        return inventory
    }

}