import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

export type ModernFile = { meta: Meta; data: Record<string, CardSet>; };