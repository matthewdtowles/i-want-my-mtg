import { Legality } from "src/core/card";
import { LegalityOrmEntity } from "./legality.orm-entity";

export class LegalityMapper {

    static toCore(legalityOrmEntity: LegalityOrmEntity): Legality {
        return {
            cardId: legalityOrmEntity.cardId,
            format: legalityOrmEntity.format,
            status: legalityOrmEntity.status,
        };
    }

    static toOrmEntity(legality: Legality): LegalityOrmEntity {
        return {
            cardId: legality.cardId,
            format: legality.format,
            status: legality.status,
        };
    }
}