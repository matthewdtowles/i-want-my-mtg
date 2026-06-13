import { BuyListItem } from 'src/core/buy-list/buy-list-item.entity';
import { CardMapper } from 'src/database/card/card.mapper';
import { BuyListOrmEntity } from './buy-list.orm-entity';

export class BuyListMapper {
    static toCore(orm: BuyListOrmEntity): BuyListItem {
        return new BuyListItem({
            userId: orm.userId,
            cardId: orm.cardId,
            isFoil: orm.isFoil,
            quantity: orm.quantity,
            createdAt: orm.createdAt,
            card: orm.card ? CardMapper.toCore(orm.card) : undefined,
        });
    }

    static toOrmEntity(item: BuyListItem): BuyListOrmEntity {
        const orm = new BuyListOrmEntity();
        orm.userId = item.userId;
        orm.cardId = item.cardId;
        orm.isFoil = item.isFoil;
        orm.quantity = item.quantity;
        return orm;
    }
}
