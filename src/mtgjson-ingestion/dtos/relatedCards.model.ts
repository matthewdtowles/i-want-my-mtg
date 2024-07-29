import { Injectable } from '@nestjs/common';

@Injectable()
export class RelatedCards {
  reverseRelated?: string[];
  spellbook?: string[];
};