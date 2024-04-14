import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type ModernAtomicFile = { meta: Meta; data: Record<string, CardAtomic>; };