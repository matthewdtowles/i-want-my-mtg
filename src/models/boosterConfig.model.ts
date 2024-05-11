import { Injectable } from '@nestjs/common';
import { BoosterPack } from './boosterPack.model';
import { BoosterSheet } from './boosterSheet.model';

@Injectable()
export class BoosterConfig {
  boosters: Record<string, BoosterPack[]>;
  boostersTotalWeight: number;
  sheets: Record<string, BoosterSheet>;
};