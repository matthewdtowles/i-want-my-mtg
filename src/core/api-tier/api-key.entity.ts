import { validateInit } from 'src/core/validation.util';

export class ApiKey {
    readonly id: number | null;
    readonly userId: number;
    readonly keyHash: string;
    readonly keyPrefix: string;
    readonly name: string;
    readonly lastUsedAt: Date | null;
    readonly revokedAt: Date | null;
    readonly createdAt: Date;

    constructor(init: Partial<ApiKey>) {
        validateInit(init, ['userId', 'keyHash', 'keyPrefix', 'name']);
        this.id = init.id ?? null;
        this.userId = init.userId;
        this.keyHash = init.keyHash;
        this.keyPrefix = init.keyPrefix;
        this.name = init.name;
        this.lastUsedAt = init.lastUsedAt ?? null;
        this.revokedAt = init.revokedAt ?? null;
        this.createdAt = init.createdAt ?? new Date();
    }

    isRevoked(): boolean {
        return this.revokedAt !== null;
    }
}
