import { User } from "src/core/user/user.entity";

export class AuthResult {
    success: boolean;
    redirectTo: string;
    statusCode: number;
    token?: string;
    user?: User;
    error?: string;

    constructor(init?: Partial<AuthResult>) {
        this.success = init?.success ?? false;
        this.redirectTo = init?.redirectTo ?? '';
        this.statusCode = init?.statusCode ?? 500;
        this.token = init?.token;
        this.user = init?.user;
        this.error = init?.error;
    }
}