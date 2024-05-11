import { Injectable } from '@nestjs/common';

@Injectable()
export class ForeignData {
  faceName?: string;
  flavorText?: string;
  language: string;
  multiverseId?: number;
  name: string;
  text?: string;
  type?: string;
};