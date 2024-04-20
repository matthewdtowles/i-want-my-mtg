import { Identifiers } from "./Identifiers";
import { PurchaseUrls } from "./PurchaseUrls";
import { SealedProductContents } from "./SealedProductContents";

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