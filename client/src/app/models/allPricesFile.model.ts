import { Meta } from "./meta.model";
import { PriceFormats } from "./priceFormats.model";

export type AllPricesFile = { meta: Meta; data: Record<string, PriceFormats>; };