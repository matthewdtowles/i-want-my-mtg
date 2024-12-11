export class BaseHttpDto {
    readonly message: string | null;
    readonly status: ActionStatus = ActionStatus.NONE;
    readonly authenticated: boolean = false;
}

export enum ActionStatus {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
    NONE = null,
}