import { Card } from "src/core/card/card.entity";
import { Set } from "src/core/set/set.entity";
import { CardMapper } from "src/database/card/card.mapper";
import { CardOrmEntity } from "src/database/card/card.orm-entity";
import { SetPriceMapper } from "./set-price.mapper";
import { SetOrmEntity } from "./set.orm-entity";


export class SetMapper {
    static toCore(ormSet: SetOrmEntity): Set {
        return new Set({
            code: ormSet.code,
            name: ormSet.name,
            releaseDate: ormSet.releaseDate,
            type: ormSet.type,
            block: ormSet.block,
            baseSize: ormSet.baseSize,
            keyruneCode: ormSet.keyruneCode,
            totalSize: ormSet.totalSize,
            prices: ormSet.setPrice ? SetPriceMapper.toCore(ormSet.setPrice) : null,
            cards: ormSet.cards && Array.isArray(ormSet.cards) ?
                ormSet.cards.map((c: CardOrmEntity) => CardMapper.toCore(c)) : [],
        });
    }

    static toOrmEntity(coreSet: Set): SetOrmEntity {
        const ormEntity = new SetOrmEntity();
        ormEntity.baseSize = coreSet.baseSize;
        ormEntity.block = coreSet.block;
        ormEntity.code = coreSet.code;
        ormEntity.keyruneCode = coreSet.keyruneCode;
        ormEntity.name = coreSet.name;
        ormEntity.releaseDate = coreSet.releaseDate;
        ormEntity.setPrice = coreSet.prices ? SetPriceMapper.toOrmEntity(coreSet.prices) : null;
        ormEntity.totalSize = coreSet.totalSize;
        ormEntity.type = coreSet.type;
        ormEntity.cards = coreSet.cards ? coreSet.cards.map((c: Card) => CardMapper.toOrmEntity(c)) : [];
        return ormEntity;
    }
}