import { Meta } from './meta.model';
import { PriceFormats } from './priceFormats.model';

export type AllPricesTodayFile = { meta: Meta; data: Record<string, PriceFormats>; };