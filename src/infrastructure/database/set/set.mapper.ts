import { Card } from "src/core/card/card.entity";
import { Set } from "src/core/set/set.entity";
import { CardMapper } from "src/infrastructure/database/card/card.mapper";
import { SetOrmEntity } from "./set.orm-entity";


export class SetMapper {
    static toCore(ormSet: SetOrmEntity): Set {
        return {
            code: ormSet.code,
            name: ormSet.name,
            releaseDate: ormSet.releaseDate,
            type: ormSet.type,
            block: ormSet.block,
            baseSize: ormSet.baseSize,
            keyruneCode: ormSet.keyruneCode,
        };
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