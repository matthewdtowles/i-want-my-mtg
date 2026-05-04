import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyRepositoryPort } from 'src/core/api-tier/ports/api-key.repository.port';
import { IsNull, Repository } from 'typeorm';
import { ApiKeyMapper } from './api-key.mapper';
import { ApiKeyOrmEntity } from './api-key.orm-entity';

@Injectable()
export class ApiKeyRepository implements ApiKeyRepositoryPort {
    constructor(
        @InjectRepository(ApiKeyOrmEntity)
        private readonly repository: Repository<ApiKeyOrmEntity>
    ) {}

    async create(apiKey: ApiKey): Promise<ApiKey> {
        const orm = ApiKeyMapper.toOrmEntity(apiKey);
        const saved = await this.repository.save(orm);
        return ApiKeyMapper.toCore(saved);
    }

    async findByHash(keyHash: string): Promise<ApiKey | null> {
        const found = await this.repository.findOneBy({ keyHash });
        return found ? ApiKeyMapper.toCore(found) : null;
    }

    async findActiveByUserId(userId: number): Promise<ApiKey | null> {
        const found = await this.repository.findOneBy({ userId, revokedAt: IsNull() });
        return found ? ApiKeyMapper.toCore(found) : null;
    }

    async findAllByUserId(userId: number): Promise<ApiKey[]> {
        const found = await this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        return found.map(ApiKeyMapper.toCore);
    }

    async revoke(id: number, when: Date): Promise<void> {
        await this.repository.update({ id }, { revokedAt: when });
    }

    async touchLastUsed(id: number, when: Date): Promise<void> {
        await this.repository.update({ id }, { lastUsedAt: when });
    }
}
