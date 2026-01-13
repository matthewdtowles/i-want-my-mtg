import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { UserRepositoryPort } from "src/core/user/user.repository.port";
import { getLogger } from "src/logger/global-app-logger";
import { CardOrmEntity } from "./card/card.orm-entity";
import { CardRepository } from "./card/card.repository";
import { LegalityOrmEntity } from "./card/legality.orm-entity";
import { InventoryOrmEntity } from "./inventory/inventory.orm-entity";
import { InventoryRepository } from "./inventory/inventory.repository";
import { PriceOrmEntity } from "./price/price.orm-entity";
import { SetPriceOrmEntity } from "./set/set-price.orm-entity";
import { SetOrmEntity } from "./set/set.orm-entity";
import { SetRepository } from "./set/set.repository";
import { UserOrmEntity } from "./user/user.orm-entity";
import { UserRepository } from "./user/user.repository";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CardOrmEntity,
            InventoryOrmEntity,
            LegalityOrmEntity,
            PriceOrmEntity,
            SetOrmEntity,
            SetPriceOrmEntity,
            UserOrmEntity,
        ]),
    ],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        { provide: InventoryRepositoryPort, useClass: InventoryRepository },
        { provide: SetRepositoryPort, useClass: SetRepository },
        { provide: UserRepositoryPort, useClass: UserRepository },
    ],
    exports: [
        CardRepositoryPort,
        InventoryRepositoryPort,
        SetRepositoryPort,
        UserRepositoryPort,
    ],
})
export class DatabaseModule {
    private readonly LOGGER = getLogger(DatabaseModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
