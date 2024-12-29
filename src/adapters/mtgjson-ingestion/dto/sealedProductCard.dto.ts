import { Injectable } from "@nestjs/common";

@Injectable()
export class SealedProductCard {
    foil?: boolean;
    name: string;
    number: string;
    set: string;
    uuid: string;
}