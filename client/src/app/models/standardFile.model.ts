import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type StandardFile = { meta: Meta; data: Record<string, CardSet>; };