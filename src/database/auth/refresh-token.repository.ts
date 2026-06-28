import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from 'src/core/auth/refresh-token.entity';
import { RefreshTokenRepositoryPort } from 'src/core/auth/ports/refresh-token.repository.port';
import { IsNull, Repository } from 'typeorm';
import { RefreshTokenMapper } from './refresh-token.mapper';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
    constructor(
        @InjectRepository(RefreshTokenOrmEntity)
        private readonly repository: Repository<RefreshTokenOrmEntity>
    ) {}

    async create(token: RefreshToken): Promise<RefreshToken> {
        const orm = RefreshTokenMapper.toOrmEntity(token);
        const saved = await this.repository.save(orm);
        return RefreshTokenMapper.toCore(saved);
    }

    async findByHash(tokenHash: string): Promise<RefreshToken | null> {
        const found = await this.repository.findOneBy({ tokenHash });
        return found ? RefreshTokenMapper.toCore(found) : null;
    }

    async revoke(id: number, when: Date): Promise<void> {
        await this.repository.update({ id }, { revokedAt: when });
    }

    async revokeAllForUser(userId: number, when: Date): Promise<void> {
        await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: when });
    }

    async touchLastUsed(id: number, when: Date): Promise<void> {
        await this.repository.update({ id }, { lastUsedAt: when });
    }
}
