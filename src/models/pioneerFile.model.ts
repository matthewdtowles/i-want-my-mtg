import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

@Injectable()
export class PioneerFile { meta: Meta; data: Record<string, CardSet>; };