import { CardAtomic } from "./CardAtomic";
import { Meta } from "./meta.model";

@Injectable()
export class PioneerAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };