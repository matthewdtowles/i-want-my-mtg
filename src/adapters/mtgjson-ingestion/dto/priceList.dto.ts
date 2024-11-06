import { Injectable } from "@nestjs/common";
import { PricePoints } from "./pricePoints.dto";

@Injectable()
export class PriceList {
  buylist?: PricePoints;
  currency: string;
  retail?: PricePoints;
};