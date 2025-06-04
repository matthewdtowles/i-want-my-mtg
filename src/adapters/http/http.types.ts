import { IsEmail, IsString } from "class-validator";
import { InventoryCardAggregateDto, InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { CardDto } from "src/core/card/api/card.dto";
import { SetDto } from "src/core/set/api/set.dto";
import { UserDto } from "src/core/user/api/user.dto";

export enum ActionStatus {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
    NONE = null,
}

export class Breadcrumb {
    readonly label: string;
    readonly url: string;
}

export class BaseHttpDto {
    readonly authenticated: boolean = false;
    readonly breadcrumbs: Breadcrumb[] = [];
    readonly message: string | null;
    readonly status: ActionStatus = ActionStatus.NONE;
}

export class CardHttpDto extends BaseHttpDto {
    readonly card: InventoryCardAggregateDto;
    readonly otherPrintings: CardDto[];
}

export class InventoryHttpDto extends BaseHttpDto {
    readonly cards: InventoryCardAggregateDto[];
    readonly username: string;
    readonly value: number;
}

export class SetListHttpDto extends BaseHttpDto {
    readonly setList: SetDto[];
}

export class SetHttpDto extends BaseHttpDto {
    readonly set: InventorySetAggregateDto;
}

export class UpdateUserHttpDto {
    @IsString() readonly name: string;
    @IsEmail() readonly email: string;
}

export class UserHttpDto extends BaseHttpDto {
    readonly user: UserDto;
}
