import { Injectable } from '@nestjs/common';
import { SealedProductCard } from './sealedProductCard.model';
import { SealedProductDeck } from './sealedProductDeck.model';
import { SealedProductOther } from './sealedProductOther.model';
import { SealedProductPack } from './sealedProductPack.model';
import { SealedProductSealed } from './sealedProductSealed.model';

@Injectable()
export class SealedProductContents {
  card?: SealedProductCard[];
  deck?: SealedProductDeck[];
  other?: SealedProductOther[];
  pack?: SealedProductPack[];
  sealed?: SealedProductSealed[];
  variable?: Record<'configs', SealedProductContents[]>[];
};