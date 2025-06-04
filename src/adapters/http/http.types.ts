import { IsEmail, IsString } from "class-validator";
import { InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
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
    readonly normalCard?: InventoryCardHttpDto;
    readonly foilCard?: InventoryCardHttpDto;
    readonly otherPrintings: InventoryCardHttpDto[];
}

export class InventoryCardHttpDto {
    artist: string;
    cardId: number;
    hidden: boolean;
    imgSrc: string;
    isFoil: boolean;
    isReserved: boolean;
    legalities?: LegalityHttpDto[];
    manaCost?: string[];
    name: string;
    displayValue: string;
    number: string;
    oracleText?: string;
    quantity: number;
    rarity: string;
    setCode: string;
    setName: string;
    type: string;
    url: string;
}

export class InventoryHttpDto extends BaseHttpDto {
    readonly cards: InventoryCardHttpDto[];
    readonly username: string;
    readonly totalValue: string;
}

export class LegalityHttpDto {
    format: string;
    status: string;
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
