import { Meta } from './Meta';
import { PriceFormats } from './PriceFormats';

export type AllPricesTodayFile = { meta: Meta; data: Record<string, PriceFormats>; };