import { Card } from '../card/card';
import { User } from '../user/user';

export class Collection {
    id: number;
    owner: User;
    cards: Card[];
}
