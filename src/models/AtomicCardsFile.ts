import { CardAtomic } from "./CardAtomic";
import { Meta } from "./Meta";

export type AtomicCardsFile = { meta: Meta; data: Record<string, CardAtomic>; };