import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type LegacyFile = { meta: Meta; data: Record<string, CardSet>; };