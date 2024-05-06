import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class VintageAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };