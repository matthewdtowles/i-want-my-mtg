import { Card } from '../card/card';
import { User } from '../user/user';

export class Collection {
    // TODO: To be designed
    id: number;
    owner: User;
    // TODO: does this belong here?
    // @OneToMany(() => Card, (card) => card.set)
    cards: Card[];
}
