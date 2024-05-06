import { Injectable } from "@nestjs/common";
import { BoosterPack } from "./BoosterPack";
import { BoosterSheet } from "./BoosterSheet";

@Injectable()
export class BoosterConfig {
  boosters: Record<string, BoosterPack[]>;
  boostersTotalWeight: number;
  sheets: Record<string, BoosterSheet>;
};