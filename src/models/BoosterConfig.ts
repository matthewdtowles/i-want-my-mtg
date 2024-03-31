import { BoosterPack } from "./BoosterPack";
import { BoosterSheet } from "./BoosterSheet";

export type BoosterConfig = {
  boosters: Record<string, BoosterPack[]>;
  boostersTotalWeight: number;
  sheets: Record<string, BoosterSheet>;
};