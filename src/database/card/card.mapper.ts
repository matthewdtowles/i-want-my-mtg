import { Card } from "src/core/card/card.entity";
import { PriceMapper } from "src/database/price/price.mapper";
import { SetMapper } from "src/database/set/set.mapper";
import { CardOrmEntity } from "./card.orm-entity";
import { LegalityMapper } from "./legality.mapper";

export class CardMapper {

    static toCore(ormCard: CardOrmEntity): Card {
        return new Card({
            id: ormCard.id,
            artist: ormCard.artist,
            hasFoil: ormCard.hasFoil,
            hasNonFoil: ormCard.hasNonFoil,
            imgSrc: ormCard.imgSrc,
            isReserved: ormCard.isReserved,
            legalities: ormCard.legalities ? ormCard.legalities.map(legality => (LegalityMapper.toCore(legality))) : [],
            manaCost: ormCard.manaCost,
            name: ormCard.name,
            number: ormCard.number,
            oracleText: ormCard.oracleText,
            rarity: ormCard.rarity,
            setCode: ormCard.setCode,
            type: ormCard.type,
            // For read operations
            order: ormCard.order,
            prices: ormCard.prices ? ormCard.prices.map(p => (PriceMapper.toCore(p))) : undefined,
            set: ormCard.set ? SetMapper.toCore(ormCard.set) : undefined,
        });
    }

    static toOrmEntity(coreCard: Card): CardOrmEntity {
        const ormEntity = new CardOrmEntity();
        ormEntity.id = coreCard.id;
        ormEntity.artist = coreCard.artist;
        ormEntity.hasFoil = coreCard.hasFoil;
        ormEntity.hasNonFoil = coreCard.hasNonFoil;
        ormEntity.imgSrc = coreCard.imgSrc;
        ormEntity.isReserved = coreCard.isReserved;
        ormEntity.legalities = coreCard.legalities.map(legality => (LegalityMapper.toOrmEntity(legality)));
        ormEntity.manaCost = coreCard.manaCost;
        ormEntity.name = coreCard.name;
        ormEntity.number = coreCard.number;
        ormEntity.oracleText = coreCard.oracleText;
        ormEntity.rarity = coreCard.rarity;
        ormEntity.setCode = coreCard.setCode;
        ormEntity.type = coreCard.type;
        return ormEntity;
    }
}