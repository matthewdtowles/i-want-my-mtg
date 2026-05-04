import { validateInit } from 'src/core/validation.util';

export class ApiUsage {
    readonly userId: number;
    readonly day: Date;
    readonly requestCount: number;

    constructor(init: Partial<ApiUsage>) {
        validateInit(init, ['userId', 'day']);
        this.userId = init.userId;
        this.day = init.day;
        this.requestCount = init.requestCount ?? 0;
    }
}
