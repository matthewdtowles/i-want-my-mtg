import { Injectable } from '@nestjs/common';
import { Identifiers } from './identifiers.model';
import { PurchaseUrls } from './purchaseUrls.model';
import { SealedProductContents } from './sealedProductContents.model';

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