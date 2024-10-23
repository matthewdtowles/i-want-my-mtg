import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { InventoryDto } from "./dto/inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { Inventory } from "./inventory.entity";
import { InventoryMapper } from "./inventory.mapper";
import { InventoryRepositoryPort } from "./ports/inventory.repository.port";
import { InventoryServicePort } from "./ports/inventory.service.port";

@Injectable()
export class InventoryService implements InventoryServicePort {

  private readonly LOGGER: Logger = new Logger(InventoryService.name);

  constructor(
    @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
    @Inject(InventoryMapper) private readonly mapper: InventoryMapper,
  ) {}

  async save(
    inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[],
  ): Promise<InventoryDto[]> {
    // TODO: if updatedInventory[i].quantity < 1: await this.inventoryService.remove(updateInventoryDtos);
    const entities: Inventory[] = this.mapper.toEntities(inventoryItems);
    const savedItems: Inventory[] = await this.repository.save(entities);
    return this.mapper.toDtos(savedItems);
  }

  async findByUser(userId: number): Promise<InventoryDto[]> {
    const foundItems: Inventory[] = await this.repository.findByUser(userId);
    this.LOGGER.debug(`Found ${JSON.stringify(foundItems)} inventory items for user ${userId}`);
    return this.mapper.toDtos(foundItems);
  }

  private async remove(inventoryItems: InventoryDto[]): Promise<void> {
    await Promise.all(
      inventoryItems.map((item) =>
        this.repository.delete(item.user.id, item.card.id),
      ),
    );
  }
}
