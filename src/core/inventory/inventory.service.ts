import { Inject, Injectable } from '@nestjs/common';
import { UserDto } from '../user/dto/user.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';
import { InventoryServicePort } from './ports/inventory.service.port';

@Injectable()
export class InventoryService implements InventoryServicePort {

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort
    ) { }

    // TODO: implement
    async save(inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[]): Promise<InventoryDto[]> {
        throw new Error('Method not implemented.');
    }

    async findByUser(user: UserDto): Promise<InventoryDto[]> {
        throw new Error('Method not implemented.');
    }

    async remove(inventoryItems: UpdateInventoryDto[]): Promise<void> {
        throw new Error('Method not implemented.');
    }


}
