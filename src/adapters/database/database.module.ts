import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { SetRepositoryPort } from "src/core/set/api/set.repository.port";
import { Set } from "src/core/set/set.entity";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { User } from "src/core/user/user.entity";
import { CardRepository } from "./card.repository";
import { InventoryRepository } from "./inventory.repository";
import { SetRepository } from "./set.repository";
import { UserRepository } from "./user.repository";

@Module({
    imports: [TypeOrmModule.forFeature([Card, Inventory, Legality, Price, Set, User])],
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
