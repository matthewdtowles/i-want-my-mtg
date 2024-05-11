import { Injectable } from '@nestjs/common';

@Injectable()
export class Keywords {
  abilityWords: string[];
  keywordAbilities: string[];
  keywordActions: string[];
};