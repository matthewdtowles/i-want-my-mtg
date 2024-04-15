import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type AtomicCardsFile = { meta: Meta; data: Record<string, CardAtomic>; };