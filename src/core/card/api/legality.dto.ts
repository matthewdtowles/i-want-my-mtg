import { IsEnum, IsInt, IsPositive } from "class-validator";

export enum Format {
    Standard = "standard",
    Commander = "commander",
    Modern = "modern",
    Legacy = "legacy",
    Vintage = "vintage",
    Brawl = "brawl",
    Explorer = "explorer",
    Historic = "historic",
    Oathbreaker = "oathbreaker",
    Pauper = "pauper",
    Pioneer = "pioneer",
}

export enum LegalityStatus {
    Legal = "Legal",
    Banned = "Banned",
    Restricted = "Restricted",
    NotLegal = "Not Legal",
}

export class LegalityDto {
    @IsInt()
    @IsPositive()
    cardId: number;

    @IsEnum(Format)
    readonly format: string;

    @IsEnum(LegalityStatus)
    readonly status: string;
}