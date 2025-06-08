import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { SetRepositoryPort } from "src/core/set/api/set.repository.port";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { CardRepository } from "src/infrastructure/database/card/card.repository";
import { LegalityOrmEntity } from "src/infrastructure/database/card/legality.orm-entity";
import { InventoryOrmEntity } from "src/infrastructure/database/inventory/inventory.orm-entity";
import { InventoryRepository } from "src/infrastructure/database/inventory/inventory.repository";
import { PriceOrmEntity } from "src/infrastructure/database/price/price.orm-entity";
import { PriceRepository } from "src/infrastructure/database/price/price.repository";
import { SetOrmEntity } from "src/infrastructure/database/set/set.orm-entity";
import { SetRepository } from "src/infrastructure/database/set/set.repository";
import { UserOrmEntity } from "src/infrastructure/database/user/user.orm-entity";
import { UserRepository } from "src/infrastructure/database/user/user.repository";

@Module({
    imports: [TypeOrmModule.forFeature([CardOrmEntity, InventoryOrmEntity, LegalityOrmEntity, PriceOrmEntity,
        SetOrmEntity, UserOrmEntity])],
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
        TypeOrmModule,
    ],
})
export class DatabaseModule {
    private readonly LOGGER: Logger = new Logger(DatabaseModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
