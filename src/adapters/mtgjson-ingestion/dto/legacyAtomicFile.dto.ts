import { Injectable } from "@nestjs/common";
import { CardAtomic } from "./cardAtomic.dto";
import { Meta } from "./meta.dto";

@Injectable()
export class LegacyAtomicFile { meta: Meta; data: Record<string, CardAtomic>; }