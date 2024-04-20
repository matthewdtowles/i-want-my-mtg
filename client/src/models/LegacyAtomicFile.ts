import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type LegacyAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };