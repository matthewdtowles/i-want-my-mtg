import { Inject, Injectable } from '@nestjs/common';
import {
    generateVerificationToken,
    getTokenExpiration,
} from 'src/core/auth/verification-token.util';
import { getLogger } from 'src/logger/global-app-logger';
import { PasswordReset } from './password-reset.entity';
import { PasswordResetRepositoryPort } from './password-reset.repository.port';

@Injectable()
export class PasswordResetService {
    private readonly LOGGER = getLogger(PasswordResetService.name);
    private readonly TOKEN_EXPIRY_HOURS = 1;

    constructor(
        @Inject(PasswordResetRepositoryPort)
        private readonly repository: PasswordResetRepositoryPort
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async createResetRequest(email: string): Promise<PasswordReset> {
        this.LOGGER.debug(`Creating password reset request for email: ${email}.`);

        await this.repository.deleteByEmail(email);

        const resetToken = generateVerificationToken();
        const expiresAt = getTokenExpiration(this.TOKEN_EXPIRY_HOURS);

        const passwordReset = new PasswordReset({
            email,
            resetToken,
            expiresAt,
        });

        return await this.repository.create(passwordReset);
    }

    async findByToken(token: string): Promise<PasswordReset | null> {
        this.LOGGER.debug(`Finding password reset by token.`);
        return await this.repository.findByToken(token);
    }

    async deleteByToken(token: string): Promise<void> {
        this.LOGGER.debug(`Deleting password reset by token.`);
        await this.repository.deleteByToken(token);
    }

    async deleteExpired(): Promise<number> {
        this.LOGGER.debug(`Deleting expired password resets.`);
        return await this.repository.deleteExpired();
    }
}
