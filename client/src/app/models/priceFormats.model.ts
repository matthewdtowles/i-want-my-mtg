import { PriceList } from "./priceList.model";

export type PriceFormats = {
  mtgo?: Record<'cardhoarder', PriceList>;
  paper?: Record<'cardkingdom' | 'cardmarket' | 'cardsphere' | 'tcgplayer', PriceList>;
};