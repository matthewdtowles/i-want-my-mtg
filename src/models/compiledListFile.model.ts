import { Meta } from "./meta.model";

@Injectable()
export class CompiledListFile { meta: Meta; data: string[]; };