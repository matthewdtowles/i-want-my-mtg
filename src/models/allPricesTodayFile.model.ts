import { Injectable } from '@nestjs/common';
import { Meta } from "./meta.model";
import { PriceFormats } from "./priceFormats.model";

@Injectable()
export class AllPricesTodayFile { meta: Meta; data: Record<string, PriceFormats>; };