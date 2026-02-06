import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PendingUser } from 'src/core/user/pending-user.entity';
import { PendingUserRepositoryPort } from 'src/core/user/pending-user.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { LessThan, Repository } from 'typeorm';
import { PendingUserOrmEntity } from './pending-user.orm-entity';

@Injectable()
export class PendingUserRepository implements PendingUserRepositoryPort {
    private readonly LOGGER = getLogger(PendingUserRepository.name);

    constructor(
        @InjectRepository(PendingUserOrmEntity)
        private readonly repository: Repository<PendingUserOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async create(pendingUser: PendingUser): Promise<PendingUser> {
        this.LOGGER.debug(`Creating pending user with email: ${pendingUser.email}.`);
        const entity = this.repository.create({
            email: pendingUser.email,
            name: pendingUser.name,
            passwordHash: pendingUser.passwordHash,
            verificationToken: pendingUser.verificationToken,
            expiresAt: pendingUser.expiresAt,
        });
        const saved = await this.repository.save(entity);
        this.LOGGER.debug(`Pending user created with id: ${saved.id}.`);
        return this.toDomain(saved);
    }

    async findByToken(token: string): Promise<PendingUser | null> {
        this.LOGGER.debug(`Finding pending user by token.`);
        const entity = await this.repository.findOne({
            where: { verificationToken: token },
        });
        this.LOGGER.debug(`Pending user ${entity ? 'found' : 'not found'} for token.`);
        return entity ? this.toDomain(entity) : null;
    }

    async findByEmail(email: string): Promise<PendingUser | null> {
        this.LOGGER.debug(`Finding pending user by email: ${email}.`);
        const entity = await this.repository.findOne({
            where: { email },
        });
        this.LOGGER.debug(`Pending user ${entity ? 'found' : 'not found'} for email: ${email}.`);
        return entity ? this.toDomain(entity) : null;
    }

    async deleteByToken(token: string): Promise<void> {
        this.LOGGER.debug(`Deleting pending user by token.`);
        await this.repository.delete({ verificationToken: token });
        this.LOGGER.debug(`Pending user deleted by token.`);
    }

    async deleteByEmail(email: string): Promise<void> {
        this.LOGGER.debug(`Deleting pending user by email: ${email}.`);
        await this.repository.delete({ email });
        this.LOGGER.debug(`Pending user deleted by email: ${email}.`);
    }

    async deleteExpired(): Promise<number> {
        this.LOGGER.debug(`Deleting expired pending users.`);
        const result = await this.repository.delete({
            expiresAt: LessThan(new Date()),
        });
        const count = result.affected ?? 0;
        this.LOGGER.debug(`Deleted ${count} expired pending users.`);
        return count;
    }

    private toDomain(entity: PendingUserOrmEntity): PendingUser {
        return new PendingUser({
            id: entity.id,
            email: entity.email,
            name: entity.name,
            passwordHash: entity.passwordHash,
            verificationToken: entity.verificationToken,
            expiresAt: entity.expiresAt,
            createdAt: entity.createdAt,
        });
    }
}
