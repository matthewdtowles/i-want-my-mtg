import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type PioneerAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };