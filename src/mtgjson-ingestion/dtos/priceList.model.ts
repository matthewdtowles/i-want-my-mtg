import { Injectable } from '@nestjs/common';
import { PricePoints } from './pricePoints.model';

@Injectable()
export class PriceList {
  buylist?: PricePoints;
  currency: string;
  retail?: PricePoints;
};