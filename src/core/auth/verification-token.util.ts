import { createHash, randomBytes } from 'crypto';

export function generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * SHA-256 of a raw token, for storage-at-rest. Verification and password-reset
 * tokens are persisted as this hash and looked up by it (C5), so a DB leak
 * yields no usable account-takeover tokens — the raw value is emailed once and
 * never stored. Same approach as {@link RefreshTokenService}.
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function getTokenExpiration(hoursFromNow: number = 24): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hoursFromNow);
    return expiration;
}
