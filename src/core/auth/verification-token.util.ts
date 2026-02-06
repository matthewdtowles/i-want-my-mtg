import { randomBytes } from 'crypto';

export function generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
}

export function getTokenExpiration(hoursFromNow: number = 24): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hoursFromNow);
    return expiration;
}
