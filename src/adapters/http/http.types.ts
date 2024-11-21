export class BaseHttpDto {
    readonly message: string | null;
    readonly status: ActionStatus = ActionStatus.NONE;
}

export enum ActionStatus {
    SUCCESS = "success",
    ERROR = "error",
    NONE = null,
}