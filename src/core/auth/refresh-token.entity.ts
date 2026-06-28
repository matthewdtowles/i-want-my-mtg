import { validateInit } from 'src/core/validation.util';

export class RefreshToken {
    readonly id: number | null;
    readonly userId: number;
    readonly tokenHash: string;
    readonly deviceLabel: string | null;
    readonly expiresAt: Date;
    readonly lastUsedAt: Date | null;
    readonly revokedAt: Date | null;
    readonly createdAt: Date;

    constructor(init: Partial<RefreshToken>) {
        validateInit(init, ['userId', 'tokenHash', 'expiresAt']);
        this.id = init.id ?? null;
        this.userId = init.userId;
        this.tokenHash = init.tokenHash;
        this.deviceLabel = init.deviceLabel ?? null;
        this.expiresAt = init.expiresAt;
        this.lastUsedAt = init.lastUsedAt ?? null;
        this.revokedAt = init.revokedAt ?? null;
        this.createdAt = init.createdAt ?? new Date();
    }

    isRevoked(): boolean {
        return this.revokedAt !== null;
    }

    isExpired(now: Date = new Date()): boolean {
        return this.expiresAt.getTime() <= now.getTime();
    }

    /** Usable for exchange: neither revoked nor expired. */
    isActive(now: Date = new Date()): boolean {
        return !this.isRevoked() && !this.isExpired(now);
    }
}
