import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CardMapper } from "../card/card.mapper";
import { User } from "../user/user.entity";
import { UserMapper } from "../user/user.mapper";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { InventoryDto } from "./dto/inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";

@Injectable()
export class InventoryMapper {

    private readonly LOGGER: Logger = new Logger(InventoryMapper.name);

    // TODO: do we need to inject CardMapper here? or UserMapper?
    constructor(
        @Inject(CardMapper) private readonly cardMapper: CardMapper,
        @Inject(UserMapper) private readonly userMapper: UserMapper,
    ) { }

    toEntities(inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[]): Inventory[] {
        this.LOGGER.debug(`toEntities ${JSON.stringify(inventoryItems)}`);
        return inventoryItems.map((item: CreateInventoryDto | UpdateInventoryDto) => this.toEntity(item));
    }

    toEntity(dto: CreateInventoryDto | UpdateInventoryDto,): Inventory | null {
        this.LOGGER.debug(`toEntity called`);
        if (!dto) {
            this.LOGGER.error("toEntity called with null dto");
            return null;
        }
        this.LOGGER.debug(`toEntity called with dto: ${JSON.stringify(dto)}`);
        const inventoryEntity = new Inventory();
        inventoryEntity.quantity = dto.quantity ?? 0;
        inventoryEntity.cardId = dto.cardId;
        inventoryEntity.user = new User();
        inventoryEntity.user.id = dto.userId;
        this.LOGGER.debug(`toEntity returning entity: ${JSON.stringify(inventoryEntity)}`);
        return inventoryEntity;
    }

    toDtos(inventoryItems: Inventory[]): InventoryDto[] {
        this.LOGGER.debug(`toDtos ${JSON.stringify(inventoryItems)}`);
        return inventoryItems.map((item: Inventory) => this.toDto(item));
    }

    toDto(inventoryEntity: Inventory): InventoryDto | null {
        this.LOGGER.debug(`toDto called`);
        if (!inventoryEntity) {
            this.LOGGER.error("toDto called with null entity");
            return null;
        }
        this.LOGGER.debug(`toDto called with entity: ${JSON.stringify(inventoryEntity)}`);


        // TODO: sketch out use cases for inventory dtos and refactor this method as needed

        // TODO: we only have the cardId and user with userId at this point
        // --> calling cardMapper will fail since we're passing a null card
        // --> calling userMapper will fail since we're passing a user with only an id
        // --> we need to fetch the card and user from the database before we can call the mapper
        // -->--> OR reevaluate: do we need the entire object ever? 
        /// -->-->--> if not, we can just pass the id and fetch the object when needed

        const inventory: InventoryDto = {
            card: this.cardMapper.entityToDto(inventoryEntity.card),
            quantity: inventoryEntity.quantity,
            user: this.userMapper.entityToDto(inventoryEntity.user),
        };
        this.LOGGER.debug(`toDto returning dto: ${JSON.stringify(inventory)}`);
        return inventory;
    }
}
