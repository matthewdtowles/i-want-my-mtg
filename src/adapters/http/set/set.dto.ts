import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsLowercase, IsOptional, IsPositive, IsString } from "class-validator";
import { CardDto } from "src/adapters/http/card/card.dto";

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
