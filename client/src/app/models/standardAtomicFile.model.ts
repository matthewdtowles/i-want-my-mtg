import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type StandardAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };