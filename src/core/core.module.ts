import { Module } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { EmailModule } from './email/email.module';
import { InventoryModule } from './inventory/inventory.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        AuthModule,
        CardModule,
        EmailModule,
        InventoryModule,
        PasswordResetModule,
        SetModule,
        UserModule,
    ],
    exports: [
        AuthModule,
        CardModule,
        EmailModule,
        InventoryModule,
        PasswordResetModule,
        SetModule,
        UserModule,
    ],
})
export class CoreModule {
    private readonly LOGGER = getLogger(CoreModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
