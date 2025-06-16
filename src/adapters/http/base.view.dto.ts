import { ActionStatus } from "src/adapters/http/action-status.enum";
import { Breadcrumb } from "src/adapters/http/breadcrumb";

export class BaseViewDto {
    readonly authenticated: boolean = false;
    readonly breadcrumbs: Breadcrumb[] = [];
    readonly message: string | null;
    readonly status: ActionStatus = ActionStatus.NONE;

    constructor(init: Partial<BaseViewDto>) {
        this.authenticated = init.authenticated || false;
        this.breadcrumbs = init.breadcrumbs || [];
        this.message = init.message || null;
        this.status = init.status || ActionStatus.NONE;
    }
}