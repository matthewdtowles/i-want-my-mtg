import { Module } from '@nestjs/common';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { UserService } from './user.service';

@Module({
    imports: [DatabaseModule, InventoryModule],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {
    private readonly LOGGER = getLogger(UserModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
