import { Injectable } from "@nestjs/common";

@Injectable()
export class PricePoints {
  foil?: Record<string, number>;
  normal?: Record<string, number>;
};