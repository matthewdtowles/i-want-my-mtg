import { Injectable } from '@nestjs/common';
import { PriceList } from './priceList.model';

@Injectable()
export class PriceFormats {
  mtgo?: Record<'cardhoarder', PriceList>;
  paper?: Record<'cardkingdom' | 'cardmarket' | 'cardsphere' | 'tcgplayer', PriceList>;
};