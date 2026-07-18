import { Module } from '@nestjs/common';
import { RefreshTokenModule } from 'src/core/auth/refresh-token.module';
import { EmailModule } from 'src/core/email/email.module';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PendingUserService } from './pending-user.service';
import { SignupService } from './signup.service';
import { UserService } from './user.service';

@Module({
    imports: [DatabaseModule, RefreshTokenModule, EmailModule],
    providers: [UserService, PendingUserService, SignupService],
    exports: [UserService, PendingUserService, SignupService],
})
export class UserModule {
    private readonly LOGGER = getLogger(UserModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
