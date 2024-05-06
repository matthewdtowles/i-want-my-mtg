import { PriceList } from "./PriceList";

@Injectable()
export class PriceFormats {
  mtgo?: Record<'cardhoarder', PriceList>;
  paper?: Record<'cardkingdom' | 'cardmarket' | 'cardsphere' | 'tcgplayer', PriceList>;
};