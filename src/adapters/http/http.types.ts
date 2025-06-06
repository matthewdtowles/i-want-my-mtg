import { IsEmail, IsString } from "class-validator";
import { PriceRepository } from "src/adapters/database/price.repository";
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

export class BaseViewDto {
    readonly authenticated: boolean = false;
    readonly breadcrumbs: Breadcrumb[] = [];
    readonly message: string | null;
    readonly status: ActionStatus = ActionStatus.NONE;
}

export class CardResponseDto {
    readonly id: number;
    readonly artist?: string;
    readonly foilPrice: PriceResponseDto;
    readonly normalPrice: PriceResponseDto;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    readonly legality: LegalityResponseDto[];
    readonly manaCost: string[];
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly rarity: string;
    readonly setCode: string;
    readonly setNumber: string;
    readonly type: string;
    readonly url: string;
}

export class CardViewDto extends BaseViewDto {
    readonly card: CardResponseDto;
    readonly otherPrintings: InventoryCardResponseDto[];
}

export class InventoryCardResponseDto {
    cardId: number;
    isFoil: boolean;
    quantity: number;
    displayValue: string;
    imgSrc: string;
    isReserved: boolean;
    manaCost?: string[];
    name: string;
    rarity: string;
    setCode: string;
    url: string;
}

export class InventoryViewDto extends BaseViewDto {
    readonly cards: InventoryCardResponseDto[];
    readonly username: string;
    readonly totalValue: string;
}

export class LegalityResponseDto {
    format: string;
    status: string;
}

export class PriceResponseDto {
    quantity: number;
    displayValue: string;
}

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetDto[];
}

export class SetViewDto extends BaseViewDto {
    readonly set: InventorySetAggregateDto;
}

export class UpdateUserRequestDto {
    @IsString() readonly name: string;
    @IsEmail() readonly email: string;
}

export class UserViewDto extends BaseViewDto {
    readonly user: UserDto;
}
