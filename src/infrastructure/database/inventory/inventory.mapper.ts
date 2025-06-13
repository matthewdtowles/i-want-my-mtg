import { Inventory } from "src/core/inventory";
import { CardMapper } from "src/infrastructure/database/card";
import { InventoryOrmEntity } from "src/infrastructure/database/inventory";

export class InventoryMapper {
    static toCore(ormInventory: InventoryOrmEntity): Inventory {
        return {
            userId: ormInventory.userId,
            cardId: ormInventory.cardId,
            quantity: ormInventory.quantity,
            isFoil: ormInventory.isFoil,
            card: ormInventory.card ? CardMapper.toCore(ormInventory.card) : undefined,
        };
    }

    static toOrmEntity(coreInventory: Inventory): InventoryOrmEntity {
        const ormEntity = new InventoryOrmEntity();
        ormEntity.cardId = coreInventory.cardId;
        ormEntity.userId = coreInventory.userId;
        ormEntity.quantity = coreInventory.quantity;
        ormEntity.isFoil = coreInventory.isFoil;
        return ormEntity;
    }
}