import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsInt, IsPositive, IsOptional, IsString, IsLowercase, IsDateString, IsEnum } from "class-validator";
import { CardDto } from "src/core/card/api/card.dto";

export enum SetType {
    Alchemy = "alchemy",
    Archenemy = "archenemy",
    Arsenal = "arsenal",
    Box = "box",
    Commander = "commander",
    Core = "core",
    DraftInnovation = "draft_innovation",
    DuelDeck = "duel_deck",
    Expansion = "expansion",
    FromTheVault = "from_the_vault",
    Funny = "funny",
    Masterpiece = "masterpiece",
    Masters = "masters",
    Memorabilia = "memorabilia",
    Minigame = "minigame",
    Planechase = "planechase",
    Premium_deck = "premium_deck",
    Promo = "promo",
    Spellbook = "spellbook",
    Starter = "starter",
    Token = "token",
    TreasureChest = "treasure_chest",
    Vanguard = "vanguard",
}

export class SetDto {
    readonly baseSize: number;
    readonly block?: string;

    @Type(() => CardDto)
    readonly cards: CardDto[];

    readonly code: string;
    readonly keyruneCode: string;
    readonly name: string;
    readonly parentCode?: string;
    readonly releaseDate: string;
    readonly type: string;
    readonly url: string;
}

export class CreateSetDto {
    @IsInt()
    @IsPositive()
    readonly baseSize: number;

    @IsOptional()
    @IsString()
    readonly block?: string;

    @IsLowercase()
    @IsString()
    readonly code: string;

    @IsLowercase()
    @IsString()
    readonly keyruneCode: string;

    @IsString()
    readonly name: string;

    @IsOptional()
    @IsLowercase()
    @IsString()
    readonly parentCode?: string;

    @IsDateString()
    readonly releaseDate: string;

    @IsEnum(SetType)
    readonly type: string;

    @IsString()
    readonly url: string;
}

export class UpdateSetDto extends PartialType(CreateSetDto) { }