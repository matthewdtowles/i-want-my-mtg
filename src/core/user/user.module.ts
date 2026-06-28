import { Module } from '@nestjs/common';
import { RefreshTokenModule } from 'src/core/auth/refresh-token.module';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PendingUserService } from './pending-user.service';
import { UserService } from './user.service';

@Module({
    imports: [DatabaseModule, RefreshTokenModule],
    providers: [UserService, PendingUserService],
    exports: [UserService, PendingUserService],
})
export class UserModule {
    private readonly LOGGER = getLogger(UserModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
