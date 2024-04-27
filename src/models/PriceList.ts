import { PricePoints } from "./PricePoints";

export type PriceList = {
  buylist?: PricePoints;
  currency: string;
  retail?: PricePoints;
};