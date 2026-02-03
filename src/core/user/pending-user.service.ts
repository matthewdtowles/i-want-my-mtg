import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
    generateVerificationToken,
    getTokenExpiration,
} from 'src/core/auth/verification-token.util';
import { getLogger } from 'src/logger/global-app-logger';
import { PendingUser } from './pending-user.entity';
import { PendingUserRepositoryPort } from './pending-user.repository.port';

@Injectable()
export class PendingUserService {
    private readonly LOGGER = getLogger(PendingUserService.name);
    private readonly SALT_ROUNDS = 10;
    private readonly TOKEN_EXPIRY_HOURS = 24;

    constructor(
        @Inject(PendingUserRepositoryPort)
        private readonly repository: PendingUserRepositoryPort
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async createPendingUser(email: string, name: string, password: string): Promise<PendingUser> {
        this.LOGGER.debug(`Creating pending user for email: ${email}.`);

        // Delete any existing pending registration for this email
        await this.repository.deleteByEmail(email);

        const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
        const verificationToken = generateVerificationToken();
        const expiresAt = getTokenExpiration(this.TOKEN_EXPIRY_HOURS);

        const pendingUser = new PendingUser({
            email,
            name,
            passwordHash,
            verificationToken,
            expiresAt,
        });

        return await this.repository.create(pendingUser);
    }

    async findByToken(token: string): Promise<PendingUser | null> {
        this.LOGGER.debug(`Finding pending user by token.`);
        return await this.repository.findByToken(token);
    }

    async findByEmail(email: string): Promise<PendingUser | null> {
        this.LOGGER.debug(`Finding pending user by email: ${email}.`);
        return await this.repository.findByEmail(email);
    }

    async deleteByToken(token: string): Promise<void> {
        this.LOGGER.debug(`Deleting pending user by token.`);
        await this.repository.deleteByToken(token);
    }

    async deleteByEmail(email: string): Promise<void> {
        this.LOGGER.debug(`Deleting pending user by email: ${email}.`);
        await this.repository.deleteByEmail(email);
    }

    async deleteExpired(): Promise<number> {
        this.LOGGER.debug(`Deleting expired pending users.`);
        return await this.repository.deleteExpired();
    }
}
