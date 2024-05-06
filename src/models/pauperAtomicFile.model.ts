import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class PauperAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };