import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { PasswordResetRepositoryPort } from 'src/core/password-reset/password-reset.repository.port';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { UserRepositoryPort } from 'src/core/user/user.repository.port';
import { PendingUserRepositoryPort } from 'src/core/user/pending-user.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { CardOrmEntity } from './card/card.orm-entity';
import { CardRepository } from './card/card.repository';
import { LegalityOrmEntity } from './card/legality.orm-entity';
import { InventoryOrmEntity } from './inventory/inventory.orm-entity';
import { InventoryRepository } from './inventory/inventory.repository';
import { PasswordResetOrmEntity } from './password-reset/password-reset.orm-entity';
import { PasswordResetRepository } from './password-reset/password-reset.repository';
import { PriceOrmEntity } from './price/price.orm-entity';
import { SetPriceOrmEntity } from './set/set-price.orm-entity';
import { SetOrmEntity } from './set/set.orm-entity';
import { SetRepository } from './set/set.repository';
import { UserOrmEntity } from './user/user.orm-entity';
import { UserRepository } from './user/user.repository';
import { PendingUserOrmEntity } from './user/pending-user.orm-entity';
import { PendingUserRepository } from './user/pending-user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CardOrmEntity,
            InventoryOrmEntity,
            LegalityOrmEntity,
            PasswordResetOrmEntity,
            PriceOrmEntity,
            SetOrmEntity,
            SetPriceOrmEntity,
            UserOrmEntity,
            PendingUserOrmEntity,
        ]),
    ],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        { provide: InventoryRepositoryPort, useClass: InventoryRepository },
        { provide: PasswordResetRepositoryPort, useClass: PasswordResetRepository },
        { provide: SetRepositoryPort, useClass: SetRepository },
        { provide: UserRepositoryPort, useClass: UserRepository },
        { provide: PendingUserRepositoryPort, useClass: PendingUserRepository },
    ],
    exports: [
        CardRepositoryPort,
        InventoryRepositoryPort,
        PasswordResetRepositoryPort,
        SetRepositoryPort,
        UserRepositoryPort,
        PendingUserRepositoryPort,
    ],
})
export class DatabaseModule {
    private readonly LOGGER = getLogger(DatabaseModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
