import { SealedProductCard } from "./sealedProductCard.model";
import { SealedProductDeck } from "./sealedProductDeck.model";
import { SealedProductOther } from "./sealedProductOther.model";
import { SealedProductPack } from "./sealedProductPack.model";
import { SealedProductSealed } from "./sealedProductSealed.model";

export type SealedProductContents = {
  card?: SealedProductCard[];
  deck?: SealedProductDeck[];
  other?: SealedProductOther[];
  pack?: SealedProductPack[];
  sealed?: SealedProductSealed[];
  variable?: Record<"configs", SealedProductContents[]>[];
};