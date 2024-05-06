import { SealedProduct } from "./SealedProduct";
import { Translations } from "./Translations";

@Injectable()
export class SetList {
  baseSetSize: number;
  block?: string;
  code: string;
  codeV3?: string;
  isForeignOnly?: boolean;
  isFoilOnly: boolean;
  isNonFoilOnly?: boolean;
  isOnlineOnly: boolean;
  isPaperOnly?: boolean;
  isPartialPreview?: boolean;
  keyruneCode: string;
  mcmId?: number;
  mcmIdExtras?: number;
  mcmName?: string;
  mtgoCode?: string;
  name: string;
  parentCode?: string;
  releaseDate: string;
  sealedProduct: SealedProduct[];
  tcgplayerGroupId?: number;
  totalSetSize: number;
  translations: Translations;
  type: string;
};