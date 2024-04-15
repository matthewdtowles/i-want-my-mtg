import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type VintageAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };