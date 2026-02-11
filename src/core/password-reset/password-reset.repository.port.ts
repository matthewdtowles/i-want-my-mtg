import { PasswordReset } from './password-reset.entity';

export const PasswordResetRepositoryPort = 'PasswordResetRepositoryPort';

export interface PasswordResetRepositoryPort {
    create(passwordReset: PasswordReset): Promise<PasswordReset>;
    findByToken(token: string): Promise<PasswordReset | null>;
    deleteByToken(token: string): Promise<void>;
    deleteByEmail(email: string): Promise<void>;
    deleteExpired(): Promise<number>;
}
