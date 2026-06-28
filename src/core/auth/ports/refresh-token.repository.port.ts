import { RefreshToken } from '../refresh-token.entity';

export const RefreshTokenRepositoryPort = 'RefreshTokenRepositoryPort';

export interface RefreshTokenRepositoryPort {
    create(token: RefreshToken): Promise<RefreshToken>;
    findByHash(tokenHash: string): Promise<RefreshToken | null>;
    revoke(id: number, when: Date): Promise<void>;
    revokeAllForUser(userId: number, when: Date): Promise<void>;
    touchLastUsed(id: number, when: Date): Promise<void>;
}
