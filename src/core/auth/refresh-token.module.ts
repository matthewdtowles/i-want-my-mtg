import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Leaf module for refresh-token issuance/rotation/revocation. Depends only on
 * the database layer, so both AuthModule (login/refresh/logout) and UserModule
 * (revoke-on-password-change) can import it without a dependency cycle.
 */
@Module({
    imports: [DatabaseModule],
    providers: [RefreshTokenService],
    exports: [RefreshTokenService],
})
export class RefreshTokenModule {
    private readonly LOGGER = getLogger(RefreshTokenModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
