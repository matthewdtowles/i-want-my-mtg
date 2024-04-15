import { Identifiers } from "./identifiers.model";
import { PurchaseUrls } from "./purchaseUrls.model";
import { SealedProductContents } from "./sealedProductContents.model";

export type SealedProduct = {
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