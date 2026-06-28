import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { getLogger } from 'src/logger/global-app-logger';
import { RefreshToken } from './refresh-token.entity';
import { RefreshTokenRepositoryPort } from './ports/refresh-token.repository.port';

const REFRESH_TOKEN_TTL_DAYS = 30;
const TOKEN_RANDOM_BYTES = 32; // -> 43 url-safe base64 chars

export interface RotatedRefreshToken {
    userId: number;
    rawToken: string;
}

/**
 * Issues, validates, rotates and revokes opaque refresh tokens. Only the
 * SHA-256 hash of each token is persisted, so the raw value exists exactly once
 * (returned to the client at issue time) and a DB leak can't be replayed.
 */
@Injectable()
export class RefreshTokenService {
    private readonly LOGGER = getLogger(RefreshTokenService.name);

    constructor(
        @Inject(RefreshTokenRepositoryPort)
        private readonly repository: RefreshTokenRepositoryPort
    ) {}

    /** Mint a new refresh token for a user and return its raw value. */
    async issue(userId: number, deviceLabel?: string | null): Promise<string> {
        const rawToken = randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
        await this.repository.create(
            new RefreshToken({
                userId,
                tokenHash: this.hash(rawToken),
                deviceLabel: deviceLabel?.trim() || null,
                expiresAt: this.expiry(),
            })
        );
        this.LOGGER.debug(`Issued refresh token for user ${userId}.`);
        return rawToken;
    }

    /**
     * Validate a raw refresh token and rotate it: the presented token is revoked
     * and a fresh one issued. Returns the owning user id + new raw token, or null
     * when the token is unknown, revoked or expired.
     */
    async rotate(rawToken: string): Promise<RotatedRefreshToken | null> {
        if (!rawToken) return null;
        const found = await this.repository.findByHash(this.hash(rawToken));
        if (!found || !found.isActive()) {
            return null;
        }
        // Single-use rotation: atomically revoke the presented token first and
        // only mint a replacement if this call won the revoke. Two concurrent
        // requests with the same token race on the conditional UPDATE; the loser
        // gets `false` and bails, so one presented token yields one new token.
        const won = await this.repository.revoke(found.id, new Date());
        if (!won) {
            return null;
        }
        const newRawToken = await this.issue(found.userId, found.deviceLabel);
        this.LOGGER.debug(`Rotated refresh token ${found.id} for user ${found.userId}.`);
        return { userId: found.userId, rawToken: newRawToken };
    }

    /** Revoke a single refresh token by its raw value (sign-out). No-op if unknown. */
    async revoke(rawToken: string): Promise<void> {
        if (!rawToken) return;
        const found = await this.repository.findByHash(this.hash(rawToken));
        if (found && !found.isRevoked()) {
            await this.repository.revoke(found.id, new Date());
            this.LOGGER.debug(`Revoked refresh token ${found.id} for user ${found.userId}.`);
        }
    }

    /** Revoke every active refresh token for a user (password change). */
    async revokeAllForUser(userId: number): Promise<void> {
        await this.repository.revokeAllForUser(userId, new Date());
        this.LOGGER.debug(`Revoked all refresh tokens for user ${userId}.`);
    }

    private expiry(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
        return expiresAt;
    }

    private hash(rawToken: string): string {
        return createHash('sha256').update(rawToken).digest('hex');
    }
}
