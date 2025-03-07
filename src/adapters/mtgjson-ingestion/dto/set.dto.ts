import { BoosterConfig } from "./boosterConfig.dto";
import { CardSet } from "./cardSet.dto";
import { CardToken } from "./cardToken.dto";
import { DeckSet } from "./deckSet.dto";
import { SealedProduct } from "./sealedProduct.dto";
import { Translations } from "./translations.dto";

export class SetDto {
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
}