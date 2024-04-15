import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type VintageFile = { meta: Meta; data: Record<string, CardSet>; };