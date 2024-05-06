import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type StandardAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };