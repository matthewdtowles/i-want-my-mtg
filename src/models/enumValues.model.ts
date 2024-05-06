import { Meta } from "./meta.model";

@Injectable()
export class EnumValues { meta: Meta; data: Record<string, Record<string, string[]>>};