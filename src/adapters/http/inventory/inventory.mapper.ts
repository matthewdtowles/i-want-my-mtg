import { Inject, Injectable } from "@nestjs/common";
import { CardMapper } from "src/adapters/http/card/card.mapper";
import { InventoryDto } from "src/adapters/http/inventory/inventory.dto";
import { Card, CardImgType } from "src/core/card";
import { Inventory } from "src/core/inventory";


@Injectable()
export class InventoryMapper {

    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    // toEntities(inventoryItems: InventoryDto[]): Inventory[] {
    //     return inventoryItems.map((item: InventoryDto) => this.toEntity(item));
    // }

    // toEntity(dto: InventoryDto): Inventory {
    //     const init: Partial<Inventory> = {
    //         cardId: dto.cardId,
    //         isFoil: dto.isFoil ?? false,
    //         quantity: dto.quantity ?? 0,
    //         userId: dto.userId,
    //         card: dto.card ? this.cardMapper.dtoToEntity(dto.card) : undefined,
    //     };
    //     return new Inventory(init);
    // }

    toDtos(entities: Inventory[]): InventoryDto[] {
        return entities.map((entity: Inventory) => this.toDto(entity));
    }

    toDto(inventoryEntity: Inventory): InventoryDto {
        const cardEntity: Card | null = inventoryEntity.card || null;
        const inventory: InventoryDto = {
            card: cardEntity ? this.cardMapper.entityToDto(inventoryEntity.card, CardImgType.SMALL) : null,
            cardId: inventoryEntity.cardId,
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.userId,
        };
        return inventory;
    }
}
