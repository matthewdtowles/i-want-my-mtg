import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class LegacyAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };