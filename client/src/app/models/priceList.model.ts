import { PricePoints } from "./pricePoints.model";

export type PriceList = {
  buylist?: PricePoints;
  currency: string;
  retail?: PricePoints;
};