import { Card } from "src/core/card/card.entity";
import { Set } from "src/core/set/set.entity";
import { CardMapper } from "src/database/card/card.mapper";
import { CardOrmEntity } from "src/database/card/card.orm-entity";
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
            cards: ormSet.cards && Array.isArray(ormSet.cards) ?
                ormSet.cards.map((c: CardOrmEntity) => CardMapper.toCore(c)) : [],
        });
    }

    static toOrmEntity(coreSet: Set): SetOrmEntity {
        return {
            code: coreSet.code,
            name: coreSet.name,
            releaseDate: coreSet.releaseDate,
            type: coreSet.type,
            block: coreSet.block,
            baseSize: coreSet.baseSize,
            keyruneCode: coreSet.keyruneCode,
            cards: coreSet.cards ? coreSet.cards.map((c: Card) => CardMapper.toOrmEntity(c)) : [],
        };
    }
}