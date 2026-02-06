import { User } from 'src/core/user/user.entity';

export class VerificationResultDto {
    readonly success: boolean;
    readonly message: string;
    readonly token?: string;
    readonly user?: User;

    constructor(init: Partial<VerificationResultDto>) {
        this.success = init.success ?? false;
        this.message = init.message ?? '';
        this.token = init.token;
        this.user = init.user;
    }
}
