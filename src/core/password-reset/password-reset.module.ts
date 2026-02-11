import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PasswordResetService } from './password-reset.service';

@Module({
    imports: [DatabaseModule],
    providers: [PasswordResetService],
    exports: [PasswordResetService],
})
export class PasswordResetModule {
    private readonly LOGGER = getLogger(PasswordResetModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
