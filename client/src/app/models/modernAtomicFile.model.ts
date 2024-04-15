import { CardAtomic } from "./cardAtomic.model";
import { Meta } from "./meta.model";

export type ModernAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };