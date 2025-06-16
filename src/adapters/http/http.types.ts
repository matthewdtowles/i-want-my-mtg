import { IsEmail, IsString } from "class-validator";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { UserDto } from "src/adapters/http/user/user.dto";


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

export class CardResponseDto {
    cardId: string;
    artist?: string;

    imgSrc: string;
    isReserved: boolean;
    legality: LegalityResponseDto[];
    manaCost: string[];
    name: string;
    number: string;
    oracleText?: string;
    rarity: string;
    setCode: string;
    setName: string;
    type: string;
    // TODO HOW ARE WE GOING TO HANDLE PRICES AND FOIL/NORMAL AND INVENTORY on CARD PAGE?11
    // readonly foilPrice: PriceResponseDto;
    // readonly normalPrice: PriceResponseDto;
    // readonly url: string; <<< ONLY USED BY otherPrintings on card page 
    // not defined but referenced: 
    // isFoil in foil.hbs, price.hbs, inventoryCtrl.hbs, cardsOwned.hbs
    // hidden in price.hbs, inventoryCtrl.hbs
    // displayValue in price.hbs
    // quantity in cardsOwned.hbs
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

export class SetResponseDto {
    readonly code: string;
    readonly name: string;
    readonly releaseDate: string;
    readonly totalCards: number;
    readonly cards: CardResponseDto[];
    readonly isFoilOnly: boolean;
    readonly isNormalOnly: boolean;
    readonly isComplete: boolean;
    readonly isReserved: boolean;
}

export class SetViewDto extends BaseViewDto {
    readonly set: SetResponseDto;
}

export class UpdateUserRequestDto {
    @IsString() readonly name: string;
    @IsEmail() readonly email: string;
}

export class UserViewDto extends BaseViewDto {
    readonly user: UserDto;
}
