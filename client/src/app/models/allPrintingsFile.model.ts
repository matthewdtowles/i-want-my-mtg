import { Meta } from "./meta.model";
import { Set } from "./set.model";

export type AllPrintingsFile = { meta: Meta; data: Record<string, Set>; };