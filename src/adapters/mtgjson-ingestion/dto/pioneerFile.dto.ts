import { Injectable } from "@nestjs/common";
import { CardSet } from "./cardSet.dto";
import { Meta } from "./meta.dto";

@Injectable()
export class PioneerFile {
    meta: Meta;
    data: Record<string, CardSet>;
}