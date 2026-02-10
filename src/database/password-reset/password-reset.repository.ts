import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordReset } from 'src/core/password-reset/password-reset.entity';
import { PasswordResetRepositoryPort } from 'src/core/password-reset/password-reset.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { LessThan, Repository } from 'typeorm';
import { PasswordResetOrmEntity } from './password-reset.orm-entity';

@Injectable()
export class PasswordResetRepository implements PasswordResetRepositoryPort {
    private readonly LOGGER = getLogger(PasswordResetRepository.name);

    constructor(
        @InjectRepository(PasswordResetOrmEntity)
        private readonly repository: Repository<PasswordResetOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async create(passwordReset: PasswordReset): Promise<PasswordReset> {
        this.LOGGER.debug(`Creating password reset for email: ${passwordReset.email}.`);
        const entity = this.repository.create({
            email: passwordReset.email,
            resetToken: passwordReset.resetToken,
            expiresAt: passwordReset.expiresAt,
        });
        const saved = await this.repository.save(entity);
        this.LOGGER.debug(`Password reset created with id: ${saved.id}.`);
        return this.toDomain(saved);
    }

    async findByToken(token: string): Promise<PasswordReset | null> {
        this.LOGGER.debug(`Finding password reset by token.`);
        const entity = await this.repository.findOne({
            where: { resetToken: token },
        });
        this.LOGGER.debug(`Password reset ${entity ? 'found' : 'not found'} for token.`);
        return entity ? this.toDomain(entity) : null;
    }

    async deleteByToken(token: string): Promise<void> {
        this.LOGGER.debug(`Deleting password reset by token.`);
        await this.repository.delete({ resetToken: token });
        this.LOGGER.debug(`Password reset deleted by token.`);
    }

    async deleteByEmail(email: string): Promise<void> {
        this.LOGGER.debug(`Deleting password resets by email: ${email}.`);
        await this.repository.delete({ email });
        this.LOGGER.debug(`Password resets deleted by email: ${email}.`);
    }

    async deleteExpired(): Promise<number> {
        this.LOGGER.debug(`Deleting expired password resets.`);
        const result = await this.repository.delete({
            expiresAt: LessThan(new Date()),
        });
        const count = result.affected ?? 0;
        this.LOGGER.debug(`Deleted ${count} expired password resets.`);
        return count;
    }

    private toDomain(entity: PasswordResetOrmEntity): PasswordReset {
        return new PasswordReset({
            id: entity.id,
            email: entity.email,
            resetToken: entity.resetToken,
            expiresAt: entity.expiresAt,
            createdAt: entity.createdAt,
        });
    }
}
