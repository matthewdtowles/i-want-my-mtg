import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { DomainValidationError, DomainNotFoundError, DomainNotAuthorizedError } from 'src/core/errors/domain.errors';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiKey } from './api-key.entity';
import { ApiKeyRepositoryPort } from './ports/api-key.repository.port';

export interface CreateApiKeyResult {
    apiKey: ApiKey;
    /** Raw key value. Shown ONCE at creation; never persisted in plaintext. */
    rawKey: string;
}

const KEY_PREFIX_BRAND = 'iwm_live_';
const KEY_RANDOM_BYTES = 24; // -> 32 url-safe base64 chars

@Injectable()
export class ApiKeyService {
    private readonly LOGGER = getLogger(ApiKeyService.name);

    constructor(
        @Inject(ApiKeyRepositoryPort) private readonly repository: ApiKeyRepositoryPort
    ) {}

    async create(userId: number, name: string): Promise<CreateApiKeyResult> {
        const trimmed = name?.trim();
        if (!trimmed) {
            throw new DomainValidationError('API key name is required.');
        }
        const existing = await this.repository.findActiveByUserId(userId);
        if (existing) {
            throw new DomainValidationError(
                'You already have an active API key. Revoke it before creating a new one.'
            );
        }
        const rawKey = this.generateRawKey();
        const keyHash = this.hashKey(rawKey);
        const keyPrefix = rawKey.slice(0, 13); // "iwm_live_" + 4 chars
        const apiKey = await this.repository.create(
            new ApiKey({ userId, keyHash, keyPrefix, name: trimmed })
        );
        this.LOGGER.log(`Created API key ${apiKey.id} for user ${userId}.`);
        return { apiKey, rawKey };
    }

    async revoke(userId: number, keyId: number): Promise<void> {
        const all = await this.repository.findAllByUserId(userId);
        const target = all.find((k) => k.id === keyId);
        if (!target) {
            throw new DomainNotFoundError(`API key ${keyId} not found.`);
        }
        if (target.userId !== userId) {
            throw new DomainNotAuthorizedError('Cannot revoke API key owned by another user.');
        }
        if (target.isRevoked()) return;
        await this.repository.revoke(keyId, new Date());
        this.LOGGER.log(`Revoked API key ${keyId} for user ${userId}.`);
    }

    async listForUser(userId: number): Promise<ApiKey[]> {
        return this.repository.findAllByUserId(userId);
    }

    async resolveByRawKey(rawKey: string): Promise<ApiKey | null> {
        if (!rawKey || !rawKey.startsWith(KEY_PREFIX_BRAND)) return null;
        const found = await this.repository.findByHash(this.hashKey(rawKey));
        if (!found || found.isRevoked()) return null;
        return found;
    }

    touchLastUsed(keyId: number): void {
        // Fire-and-forget; failure to update last_used_at must not break the request.
        this.repository.touchLastUsed(keyId, new Date()).catch((err) => {
            this.LOGGER.warn(`Failed to update last_used_at for key ${keyId}: ${err?.message}`);
        });
    }

    private generateRawKey(): string {
        return KEY_PREFIX_BRAND + randomBytes(KEY_RANDOM_BYTES).toString('base64url');
    }

    private hashKey(rawKey: string): string {
        return createHash('sha256').update(rawKey).digest('hex');
    }
}
