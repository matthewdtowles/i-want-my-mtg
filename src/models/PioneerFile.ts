import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type PioneerFile = { meta: Meta; data: Record<string, CardSet>; };