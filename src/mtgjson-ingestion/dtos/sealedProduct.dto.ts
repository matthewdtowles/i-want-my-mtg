import { Injectable } from '@nestjs/common';
import { Identifiers } from './identifiers.dto';
import { PurchaseUrls } from './purchaseUrls.dto';
import { SealedProductContents } from './sealedProductContents.dto';

@Injectable()
export class SealedProduct {
  cardCount?: number;
  category?: string;
  contents?: SealedProductContents;
  identifiers: Identifiers;
  name: string;
  productSize?: number;
  purchaseUrls: PurchaseUrls;
  releaseDate?: string;
  subtype: string | null;
  uuid: string;
};