export type SealedProductContents = {
  card?: SealedProductCard[];
  deck?: SealedProductDeck[];
  other?: SealedProductOther[];
  pack?: SealedProductPack[];
  sealed?: SealedProductSealed[];
  variable?: Record<"configs", SealedProductContents[]>[];
};