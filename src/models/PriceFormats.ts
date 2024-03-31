import { PriceList } from "./PriceList";

export type PriceFormats = {
  mtgo?: Record<'cardhoarder', PriceList>;
  paper?: Record<'cardkingdom' | 'cardmarket' | 'cardsphere' | 'tcgplayer', PriceList>;
};