import { CardSetDeck } from "./CardSetDeck";

@Injectable()
export class DeckSet {
  code: string;
  commander?: CardSetDeck[];
  mainBoard: CardSetDeck[];
  name: string;
  releaseDate: string | null;
  sealedProductUuids: string[] | null;
  sideBoard: CardSetDeck[];
  type: string;
};