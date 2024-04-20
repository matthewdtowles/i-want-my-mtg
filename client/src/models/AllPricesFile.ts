import { Meta } from "./Meta";
import { PriceFormats } from "./PriceFormats";

export type AllPricesFile = { meta: Meta; data: Record<string, PriceFormats>; };