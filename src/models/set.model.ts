import { BoosterConfig } from './boosterConfig.model';
import { CardSet } from './cardSet.model';
import { CardToken } from './cardToken.model';
import { DeckSet } from './deckSet.model';
import { SealedProduct } from './sealedProduct.model';
import { Translations } from './translations.model';

export class Set {
  baseSetSize: number;
  block?: string;
  booster?: Record<string, BoosterConfig>;
  cards: CardSet[];
  cardsphereSetId?: number;
  code: string;
  codeV3?: string;
  decks?: DeckSet[];
  isForeignOnly?: boolean;
  isFoilOnly: boolean;
  isNonFoilOnly?: boolean;
  isOnlineOnly: boolean;
  isPaperOnly?: boolean;
  isPartialPreview?: boolean;
  keyruneCode: string;
  languages?: string[];
  mcmId?: number;
  mcmIdExtras?: number;
  mcmName?: string;
  mtgoCode?: string;
  name: string;
  parentCode?: string;
  releaseDate: string;
  sealedProduct?: SealedProduct[];
  tcgplayerGroupId?: number;
  tokens: CardToken[];
  tokenSetCode?: string;
  totalSetSize: number;
  translations: Translations;
  type: string;
};