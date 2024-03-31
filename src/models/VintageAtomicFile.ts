import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type VintageAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };