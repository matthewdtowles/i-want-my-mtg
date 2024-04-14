import { CardDeck } from "./CardDeck";

export type Deck = {
  code: string;
  commander?: CardDeck[];
  mainBoard: CardDeck[];
  name: string;
  releaseDate: string | null;
  sideBoard: CardDeck[];
  type: string;
};