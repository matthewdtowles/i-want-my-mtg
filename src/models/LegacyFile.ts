import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type LegacyFile = { meta: Meta; data: Record<string, CardSet>; };