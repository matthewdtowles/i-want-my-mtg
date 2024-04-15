import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type PioneerFile = { meta: Meta; data: Record<string, CardSet>; };