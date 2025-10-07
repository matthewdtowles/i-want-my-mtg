import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { PriceRepositoryPort } from "src/core/price/price.repository.port";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { UserRepositoryPort } from "src/core/user/user.repository.port";
import { CardOrmEntity } from "src/database/card/card.orm-entity";
import { CardRepository } from "src/database/card/card.repository";
import { LegalityOrmEntity } from "src/database/card/legality.orm-entity";
import { InventoryOrmEntity } from "src/database/inventory/inventory.orm-entity";
import { InventoryRepository } from "src/database/inventory/inventory.repository";
import { PriceOrmEntity } from "src/database/price/price.orm-entity";
import { PriceRepository } from "src/database/price/price.repository";
import { SetOrmEntity } from "src/database/set/set.orm-entity";
import { SetRepository } from "src/database/set/set.repository";
import { UserOrmEntity } from "src/database/user/user.orm-entity";
import { UserRepository } from "src/database/user/user.repository";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CardOrmEntity,
            InventoryOrmEntity,
            LegalityOrmEntity,
            PriceOrmEntity,
            SetOrmEntity,
            UserOrmEntity
        ]),
    ],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        { provide: InventoryRepositoryPort, useClass: InventoryRepository },
        { provide: PriceRepositoryPort, useClass: PriceRepository },
        { provide: SetRepositoryPort, useClass: SetRepository },
        { provide: UserRepositoryPort, useClass: UserRepository },
    ],
    exports: [
        CardRepositoryPort,
        InventoryRepositoryPort,
        PriceRepositoryPort,
        SetRepositoryPort,
        UserRepositoryPort,
    ],
})
export class DatabaseModule {
    private readonly LOGGER: Logger = new Logger(DatabaseModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
