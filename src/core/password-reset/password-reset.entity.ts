export class PasswordReset {
    readonly id: number;
    readonly email: string;
    readonly resetToken: string;
    readonly expiresAt: Date;
    readonly createdAt: Date;

    constructor(init: Partial<PasswordReset>) {
        this.id = init.id;
        this.email = init.email;
        this.resetToken = init.resetToken;
        this.expiresAt = init.expiresAt;
        this.createdAt = init.createdAt ?? new Date();
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }
}
