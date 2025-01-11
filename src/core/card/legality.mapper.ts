import { Injectable } from "@nestjs/common";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { Legality } from "src/core/card/legality.entity";

@Injectable()
export class LegalityMapper {
    toDto(entity: Legality): LegalityDto {
        return {
            cardId: entity.cardId,
            format: entity.format,
            status: entity.status,
        };
    }

    toDtos(entities: Legality[]): LegalityDto[] {
        return entities.map((entity: Legality) => this.toDto(entity));
    }

    toEntity(dto: LegalityDto): Legality {
        const entity: Legality = new Legality();
        entity.cardId = dto.cardId;
        entity.format = dto.format;
        entity.status = dto.status;
        return entity;
    }

    toEntities(dtos: LegalityDto[]): Legality[] {
        return dtos.map((dto: LegalityDto) => this.toEntity(dto));
    }
}