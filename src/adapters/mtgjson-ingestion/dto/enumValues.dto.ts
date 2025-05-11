import { Injectable } from "@nestjs/common";
import { Meta } from "./meta.dto";

@Injectable()
export class EnumValues {
    meta: Meta;
    data: Record<string, Record<string, string[]>>
}