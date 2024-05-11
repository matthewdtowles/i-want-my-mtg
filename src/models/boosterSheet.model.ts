import { Injectable } from '@nestjs/common';

@Injectable()
export class BoosterSheet {
  allowDuplicates?: boolean;
  balanceColors?: boolean;
  cards: Record<string, number>;
  foil: boolean;
  fixed?: boolean;
  totalWeight: number;
};