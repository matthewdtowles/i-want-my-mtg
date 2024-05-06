import { CardSet } from "./cardSet.model";
import { Meta } from "./meta.model";

@Injectable()
export class ModernFile { meta: Meta; data: Record<string, CardSet>; };