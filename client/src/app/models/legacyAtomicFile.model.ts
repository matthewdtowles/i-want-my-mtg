import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type LegacyAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };