import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type ModernFile = { meta: Meta; data: Record<string, CardSet>; };