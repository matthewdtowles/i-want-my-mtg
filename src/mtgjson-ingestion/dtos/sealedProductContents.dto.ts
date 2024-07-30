import { Injectable } from '@nestjs/common';
import { SealedProductCard } from './sealedProductCard.dto';
import { SealedProductDeck } from './sealedProductDeck.dto';
import { SealedProductOther } from './sealedProductOther.dto';
import { SealedProductPack } from './sealedProductPack.dto';
import { SealedProductSealed } from './sealedProductSealed.dto';

@Injectable()
export class SealedProductContents {
  card?: SealedProductCard[];
  deck?: SealedProductDeck[];
  other?: SealedProductOther[];
  pack?: SealedProductPack[];
  sealed?: SealedProductSealed[];
  variable?: Record<'configs', SealedProductContents[]>[];
};