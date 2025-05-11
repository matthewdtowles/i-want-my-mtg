import { Injectable } from "@nestjs/common";
import { Meta } from "./meta.dto";
import { PriceFormats } from "./priceFormats.dto";

@Injectable()
export class AllPricesTodayFile {
    meta: Meta;
    data: Record<string, PriceFormats>;
};