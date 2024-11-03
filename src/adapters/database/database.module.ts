import { Logger, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { SetRepositoryPort } from "src/core/set/api/set.repository.port";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { Set } from "../../core/set/set.entity";
import { User } from "../../core/user/user.entity";
import { CardRepository } from "./card.repository";
import { InventoryRepository } from "./inventory.repository";
import { SetRepository } from "./set.repository";
import { UserRepository } from "./user.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Card, Inventory, Set, User])],
  providers: [
    {
      provide: CardRepositoryPort,
      useClass: CardRepository,
    },
    {
      provide: InventoryRepositoryPort,
      useClass: InventoryRepository,
    },
    {
      provide: SetRepositoryPort,
      useClass: SetRepository,
    },
    {
      provide: UserRepositoryPort,
      useClass: UserRepository,
    },
  ],
  exports: [
    CardRepositoryPort,
    InventoryRepositoryPort,
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
