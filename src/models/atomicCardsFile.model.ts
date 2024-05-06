import { Injectable } from "@nestjs/common";
import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class AtomicCardsFile { meta: Meta; data: Record<string, CardAtomic>; }