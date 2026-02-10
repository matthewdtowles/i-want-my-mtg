import { User } from 'src/core/user/user.entity';

export class ResetPasswordResultDto {
    readonly success: boolean;
    readonly message: string;
    readonly token?: string;
    readonly user?: User;

    constructor(init: Partial<ResetPasswordResultDto>) {
        this.success = init.success ?? false;
        this.message = init.message ?? '';
        this.token = init.token;
        this.user = init.user;
    }
}
