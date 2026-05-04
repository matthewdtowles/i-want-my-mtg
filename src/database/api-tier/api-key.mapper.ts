import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyOrmEntity } from './api-key.orm-entity';

export class ApiKeyMapper {
    static toCore(orm: ApiKeyOrmEntity): ApiKey {
        return new ApiKey({
            id: orm.id,
            userId: orm.userId,
            keyHash: orm.keyHash,
            keyPrefix: orm.keyPrefix,
            name: orm.name,
            lastUsedAt: orm.lastUsedAt,
            revokedAt: orm.revokedAt,
            createdAt: orm.createdAt,
        });
    }

    static toOrmEntity(core: ApiKey): ApiKeyOrmEntity {
        const orm = new ApiKeyOrmEntity();
        if (core.id !== null) orm.id = core.id;
        orm.userId = core.userId;
        orm.keyHash = core.keyHash;
        orm.keyPrefix = core.keyPrefix;
        orm.name = core.name;
        orm.lastUsedAt = core.lastUsedAt;
        orm.revokedAt = core.revokedAt;
        orm.createdAt = core.createdAt;
        return orm;
    }
}
