import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RefreshTokenService } from 'src/core/auth/refresh-token.service';
import { DomainValidationError } from 'src/core/errors/domain.errors';
import { getLogger } from 'src/logger/global-app-logger';
import { User } from './user.entity';
import { UserRepositoryPort } from './ports/user.repository.port';

@Injectable()
export class UserService {
    private readonly LOGGER = getLogger(UserService.name);

    constructor(
        @Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort,
        @Inject(RefreshTokenService) private readonly refreshTokenService: RefreshTokenService
    ) {}

    async createWithHashedPassword(user: User): Promise<User> {
        // Skip password hashing since it's already hashed
        return await this.repository.create(user);
    }

    async findById(id: number): Promise<User | null> {
        this.LOGGER.debug(`Find user ID ${id}.`);
        return await this.repository.findById(id);
    }

    async findByEmail(email: string): Promise<User | null> {
        this.LOGGER.debug(`Find user with email ${email}.`);
        return await this.repository.findByEmail(email);
    }

    async findSavedPassword(email: string): Promise<string | null> {
        this.LOGGER.debug(`Find saved password for email ${email}.`);
        const user: User = await this.repository.findByEmail(email);
        return user ? user.password : null;
    }

    async update(user: User): Promise<User | null> {
        this.LOGGER.debug(`Update user ID ${user?.id}.`);
        if (user.password) {
            throw new DomainValidationError('Password must be updated separately.');
        }
        return (await this.repository.update(user)) ?? null;
    }

    async updateSetTypePreference(
        userId: number,
        includedSetTypes: string[] | null
    ): Promise<User | null> {
        this.LOGGER.debug(`Update set-type preference for user ${userId}.`);
        const existing = await this.repository.findById(userId);
        if (!existing) {
            return null;
        }
        const updated = new User({
            ...existing,
            password: undefined,
            includedSetTypes,
        });
        return (await this.repository.update(updated)) ?? null;
    }

    async updatePassword(userIn: User, newPassword: string): Promise<boolean> {
        this.LOGGER.debug(`Update password user ${userIn.id}, pwd XXXXXXXX.`);
        const user: User = new User({
            ...userIn,
            password: await this.encrypt(newPassword),
        });
        // Sign out every long-lived mobile/API session *before* writing the new
        // password: if revocation fails we abort, so we never leave a changed
        // password with old refresh tokens still live.
        if (userIn.id) {
            await this.refreshTokenService.revokeAllForUser(userIn.id);
        }
        return !!(await this.repository.update(user));
    }

    async remove(id: number): Promise<void> {
        this.LOGGER.debug(`Remove user ${id}.`);
        await this.repository.delete(id);
    }

    private async encrypt(password: string): Promise<string> {
        this.LOGGER.debug(`Encrypt password.`);
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
}
