import { PricePoints } from "./PricePoints";

@Injectable()
export class PriceList {
  buylist?: PricePoints;
  currency: string;
  retail?: PricePoints;
};