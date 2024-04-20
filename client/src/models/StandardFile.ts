import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type StandardFile = { meta: Meta; data: Record<string, CardSet>; };