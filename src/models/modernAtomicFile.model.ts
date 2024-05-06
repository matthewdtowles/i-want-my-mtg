import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class ModernAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };