import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type PioneerAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };