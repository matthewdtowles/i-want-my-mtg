import { BoosterPack } from "./boosterPack.model";
import { BoosterSheet } from "./boosterSheet.model";

export type BoosterConfig = {
  boosters: Record<string, BoosterPack[]>;
  boostersTotalWeight: number;
  sheets: Record<string, BoosterSheet>;
};