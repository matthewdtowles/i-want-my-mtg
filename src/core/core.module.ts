import { Module } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthModule } from './auth/auth.module';
import { CardModule } from './card/card.module';
import { InventoryModule } from './inventory/inventory.module';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [AuthModule, CardModule, InventoryModule, SetModule, UserModule],
    exports: [AuthModule, CardModule, InventoryModule, SetModule, UserModule],
})
export class CoreModule {
    private readonly LOGGER = getLogger(CoreModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
