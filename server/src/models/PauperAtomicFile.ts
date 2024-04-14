import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type PauperAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };