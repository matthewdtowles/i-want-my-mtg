import { User } from 'src/core/user/user.entity';

export class AuthResult {
    readonly success: boolean;
    readonly redirectTo: string;
    readonly statusCode: number;
    readonly token?: string;
    readonly user?: User;
    readonly error?: string;

    constructor(init?: Partial<AuthResult>) {
        this.success = init?.success ?? false;
        this.redirectTo = init?.redirectTo ?? '/';
        this.statusCode = init?.statusCode ?? 500;
        this.token = init?.token;
        this.user = init?.user;
        this.error = init?.error;
    }
}
