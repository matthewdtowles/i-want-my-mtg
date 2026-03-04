export class TransactionApiResponseDto {
    readonly success: boolean;
    readonly data?: Record<string, unknown>;
    readonly error?: string;

    constructor(init: Partial<TransactionApiResponseDto>) {
        this.success = init.success ?? false;
        this.data = init.data;
        this.error = init.error;
    }
}
