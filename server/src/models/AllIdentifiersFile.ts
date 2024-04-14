import { CardSet } from "./CardSet";
import { Meta } from "./Meta";

export type AllIdentifiersFile = { meta: Meta; data: Record<string, CardSet>; };