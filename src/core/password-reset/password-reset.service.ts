import { Inject, Injectable } from '@nestjs/common';
import {
    generateVerificationToken,
    getTokenExpiration,
    hashToken,
} from 'src/core/auth/verification-token.util';
import { getLogger } from 'src/logger/global-app-logger';
import { PasswordReset } from './password-reset.entity';
import { PasswordResetRepositoryPort } from './ports/password-reset.repository.port';

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

        const rawToken = generateVerificationToken();
        const expiresAt = getTokenExpiration(this.TOKEN_EXPIRY_HOURS);

        // Persist only the hash (C5); the raw token is emailed to the user.
        const passwordReset = new PasswordReset({
            email,
            resetToken: hashToken(rawToken),
            expiresAt,
        });

        const saved = await this.repository.create(passwordReset);
        // Hand the raw token back to the caller for the reset email.
        return new PasswordReset({ ...saved, resetToken: rawToken });
    }

    async findByToken(token: string): Promise<PasswordReset | null> {
        this.LOGGER.debug(`Finding password reset by token.`);
        return await this.repository.findByToken(hashToken(token));
    }

    async deleteByToken(token: string): Promise<void> {
        this.LOGGER.debug(`Deleting password reset by token.`);
        await this.repository.deleteByToken(hashToken(token));
    }

    async deleteExpired(): Promise<number> {
        this.LOGGER.debug(`Deleting expired password resets.`);
        return await this.repository.deleteExpired();
    }
}
