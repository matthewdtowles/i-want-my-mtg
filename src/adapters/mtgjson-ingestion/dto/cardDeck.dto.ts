import { Injectable } from "@nestjs/common";
import { ForeignData } from "./foreignData.dto";
import { Identifiers } from "./identifiers.dto";
import { LeadershipSkills } from "./leadershipSkills.dto";
import { Legalities } from "./legalities.dto";
import { PurchaseUrls } from "./purchaseUrls.dto";
import { RelatedCards } from "./relatedCards.dto";
import { Rulings } from "./rulings.dto";

@Injectable()
export class CardDeck {
    artist?: string;
    artistIds?: string[];
    asciiName?: string;
    attractionLights?: number[];
    availability: string[];
    boosterTypes?: string[];
    borderColor: string;
    cardParts?: string[];
    colorIdentity: string[];
    colorIndicator?: string[];
    colors: string[];
    convertedManaCost: number;
    count: number;
    defense?: string;
    duelDeck?: string;
    edhrecRank?: number;
    edhrecSaltiness?: number;
    faceConvertedManaCost?: number;
    faceFlavorName?: string;
    faceManaValue?: number;
    faceName?: string;
    finishes: string[];
    flavorName?: string;
    flavorText?: string;
    foreignData?: ForeignData[];
    frameEffects?: string[];
    frameVersion: string;
    hand?: string;
    hasAlternativeDeckLimit?: boolean;
    hasContentWarning?: boolean;
    hasFoil: boolean;
    hasNonFoil: boolean;
    identifiers: Identifiers;
    isAlternative?: boolean;
    isFoil: boolean;
    isFullArt?: boolean;
    isFunny?: boolean;
    isOnlineOnly?: boolean;
    isOversized?: boolean;
    isPromo?: boolean;
    isRebalanced?: boolean;
    isReprint?: boolean;
    isReserved?: boolean;
    isStarter?: boolean;
    isStorySpotlight?: boolean;
    isTextless?: boolean;
    isTimeshifted?: boolean;
    keywords?: string[];
    language: string;
    layout: string;
    leadershipSkills?: LeadershipSkills;
    legalities: Legalities;
    life?: string;
    loyalty?: string;
    manaCost?: string;
    manaValue: number;
    name: string;
    number: string;
    originalPrintings?: string[];
    originalReleaseDate?: string;
    originalText?: string;
    originalType?: string;
    otherFaceIds?: string[];
    power?: string;
    printings?: string[];
    promoTypes?: string[];
    purchaseUrls: PurchaseUrls;
    rarity: string;
    relatedCards: RelatedCards;
    rebalancedPrintings?: string[];
    rulings?: Rulings[];
    securityStamp?: string;
    setCode: string;
    side?: string;
    signature?: string;
    sourceProducts?: string[];
    subsets?: string[];
    subtypes: string[];
    supertypes: string[];
    text?: string;
    toughness?: string;
    type: string;
    types: string[];
    uuid: string;
    variations?: string[];
    watermark?: string;
};