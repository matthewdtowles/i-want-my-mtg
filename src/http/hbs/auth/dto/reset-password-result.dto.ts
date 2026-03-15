export class ResetPasswordResultDto {
    readonly success: boolean;
    readonly message: string;
    readonly token?: string;

    constructor(init: Partial<ResetPasswordResultDto>) {
        this.success = init.success ?? false;
        this.message = init.message ?? '';
        this.token = init.token;
    }
}
