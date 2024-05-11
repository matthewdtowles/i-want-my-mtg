import { Injectable } from '@nestjs/common';

@Injectable()
export class CardType {
  subTypes: string[];
  superTypes: string[];
};