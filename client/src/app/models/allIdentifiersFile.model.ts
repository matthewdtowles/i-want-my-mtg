import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type AllIdentifiersFile = { meta: Meta; data: Record<string, CardSet>; };