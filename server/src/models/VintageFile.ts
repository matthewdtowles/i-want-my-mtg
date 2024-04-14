import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type VintageFile = { meta: Meta; data: Record<string, CardSet>; };