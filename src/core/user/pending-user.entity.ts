export class PendingUser {
    readonly id: number;
    readonly email: string;
    readonly name: string;
    readonly passwordHash: string;
    readonly verificationToken: string;
    readonly expiresAt: Date;
    readonly createdAt: Date;

    constructor(init: Partial<PendingUser>) {
        this.id = init.id;
        this.email = init.email;
        this.name = init.name;
        this.passwordHash = init.passwordHash;
        this.verificationToken = init.verificationToken;
        this.expiresAt = init.expiresAt;
        this.createdAt = init.createdAt ?? new Date();
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }
}
