import { ActionStatus } from './action-status.enum';

export class Toast {
    constructor(
        readonly message: string,
        readonly status: ActionStatus,
    ) {}
}
