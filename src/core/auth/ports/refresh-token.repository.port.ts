import { RefreshToken } from '../refresh-token.entity';

export const RefreshTokenRepositoryPort = 'RefreshTokenRepositoryPort';

export interface RefreshTokenRepositoryPort {
    create(token: RefreshToken): Promise<RefreshToken>;
    findByHash(tokenHash: string): Promise<RefreshToken | null>;
    /** Revoke the token only if still active; returns true when this call performed the revoke. */
    revoke(id: number, when: Date): Promise<boolean>;
    revokeAllForUser(userId: number, when: Date): Promise<void>;
}
