import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { PriceHistoryRepositoryPort } from 'src/core/card/price-history.repository.port';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { PasswordResetRepositoryPort } from 'src/core/password-reset/password-reset.repository.port';
import { SetPriceHistoryRepositoryPort } from 'src/core/set/set-price-history.repository.port';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { UserRepositoryPort } from 'src/core/user/user.repository.port';
import { TransactionRepositoryPort } from 'src/core/transaction/transaction.repository.port';
import { PendingUserRepositoryPort } from 'src/core/user/pending-user.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { CardOrmEntity } from './card/card.orm-entity';
import { CardRepository } from './card/card.repository';
import { LegalityOrmEntity } from './card/legality.orm-entity';
import { InventoryOrmEntity } from './inventory/inventory.orm-entity';
import { InventoryRepository } from './inventory/inventory.repository';
import { PasswordResetOrmEntity } from './password-reset/password-reset.orm-entity';
import { PasswordResetRepository } from './password-reset/password-reset.repository';
import { PriceHistoryOrmEntity } from './price-history/price-history.orm-entity';
import { PriceHistoryRepository } from './price-history/price-history.repository';
import { PriceOrmEntity } from './price/price.orm-entity';
import { SetPriceHistoryOrmEntity } from './set-price-history/set-price-history.orm-entity';
import { SetPriceHistoryRepository } from './set-price-history/set-price-history.repository';
import { SetPriceOrmEntity } from './set/set-price.orm-entity';
import { SetOrmEntity } from './set/set.orm-entity';
import { SetRepository } from './set/set.repository';
import { UserOrmEntity } from './user/user.orm-entity';
import { UserRepository } from './user/user.repository';
import { TransactionOrmEntity } from './transaction/transaction.orm-entity';
import { TransactionRepository } from './transaction/transaction.repository';
import { PendingUserOrmEntity } from './user/pending-user.orm-entity';
import { PendingUserRepository } from './user/pending-user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CardOrmEntity,
            InventoryOrmEntity,
            LegalityOrmEntity,
            PasswordResetOrmEntity,
            PriceHistoryOrmEntity,
            PriceOrmEntity,
            SetOrmEntity,
            SetPriceOrmEntity,
            SetPriceHistoryOrmEntity,
            TransactionOrmEntity,
            UserOrmEntity,
            PendingUserOrmEntity,
        ]),
    ],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        { provide: PriceHistoryRepositoryPort, useClass: PriceHistoryRepository },
        { provide: InventoryRepositoryPort, useClass: InventoryRepository },
        { provide: PasswordResetRepositoryPort, useClass: PasswordResetRepository },
        { provide: SetPriceHistoryRepositoryPort, useClass: SetPriceHistoryRepository },
        { provide: SetRepositoryPort, useClass: SetRepository },
        { provide: TransactionRepositoryPort, useClass: TransactionRepository },
        { provide: UserRepositoryPort, useClass: UserRepository },
        { provide: PendingUserRepositoryPort, useClass: PendingUserRepository },
    ],
    exports: [
        CardRepositoryPort,
        PriceHistoryRepositoryPort,
        InventoryRepositoryPort,
        PasswordResetRepositoryPort,
        SetPriceHistoryRepositoryPort,
        SetRepositoryPort,
        TransactionRepositoryPort,
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
