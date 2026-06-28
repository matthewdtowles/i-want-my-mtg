import { RefreshToken } from 'src/core/auth/refresh-token.entity';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

export class RefreshTokenMapper {
    static toCore(orm: RefreshTokenOrmEntity): RefreshToken {
        return new RefreshToken({
            id: orm.id,
            userId: orm.userId,
            tokenHash: orm.tokenHash,
            deviceLabel: orm.deviceLabel,
            expiresAt: orm.expiresAt,
            revokedAt: orm.revokedAt,
            createdAt: orm.createdAt,
        });
    }

    static toOrmEntity(core: RefreshToken): RefreshTokenOrmEntity {
        const orm = new RefreshTokenOrmEntity();
        if (core.id !== null) orm.id = core.id;
        orm.userId = core.userId;
        orm.tokenHash = core.tokenHash;
        orm.deviceLabel = core.deviceLabel;
        orm.expiresAt = core.expiresAt;
        orm.revokedAt = core.revokedAt;
        orm.createdAt = core.createdAt;
        return orm;
    }
}
