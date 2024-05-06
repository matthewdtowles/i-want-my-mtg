import { SealedProductCard } from "./SealedProductCard";
import { SealedProductDeck } from "./SealedProductDeck";
import { SealedProductOther } from "./SealedProductOther";
import { SealedProductPack } from "./SealedProductPack";
import { SealedProductSealed } from "./SealedProductSealed";

@Injectable()
export class SealedProductContents {
  card?: SealedProductCard[];
  deck?: SealedProductDeck[];
  other?: SealedProductOther[];
  pack?: SealedProductPack[];
  sealed?: SealedProductSealed[];
  variable?: Record<"configs", SealedProductContents[]>[];
};