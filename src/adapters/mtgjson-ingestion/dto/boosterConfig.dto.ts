import { Injectable } from "@nestjs/common";
import { BoosterPack } from "./boosterPack.dto";
import { BoosterSheet } from "./boosterSheet.dto";

@Injectable()
export class BoosterConfig {
    boosters: Record<string, BoosterPack[]>;
    boostersTotalWeight: number;
    sheets: Record<string, BoosterSheet>;
};