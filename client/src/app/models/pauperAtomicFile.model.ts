import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type PauperAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };