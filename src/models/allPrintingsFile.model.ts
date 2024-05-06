import { Meta } from "./meta.model";
import { Set } from "./Set";

@Injectable()
export class AllPrintingsFile { meta: Meta; data: Record<string, Set>; };