import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { LegalityResponseDto } from "src/adapters/http/card/dto/legality.response.dto";
import { SingleCardResponseDto } from "src/adapters/http/card/dto/single-card.response.dto";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";

export class CardPresenter {

    private static readonly SCRYFALL_CARD_IMAGE_URL: string = "https://cards.scryfall.io";

    static toCardResponse(card: Card): CardResponseDto {
        const response: CardResponseDto = new CardResponseDto({
            cardId: card.id,
            imgSrc: this.buildImgSrc(card, CardImgType.SMALL),
            inventoryInfo: card.inventoryInfo,
            isReserved: card.isReserved,
            manaCost: card.manaCost ? this.manaForView(card.manaCost) : [],
            name: card.name,
            number: card.number,
            price: card.prices?.[0],
            rarity: card.rarity ? this.convertToCardRarity(card.rarity).toLowerCase() : "",
            setCode: card.setCode,
            type: card.type,
            url: this.buildCardUrl(card),
        });
        return response;
    }

    static toSingleCardResponse(card: Card): SingleCardResponseDto {
        const response: SingleCardResponseDto = new SingleCardResponseDto({
            ...this.toCardResponse(card),
            legalities: card.legalities?.map(legality => new LegalityResponseDto({
                cardId: legality.cardId,
                format: legality.format ? this.convertToFormat(legality.format).toLowerCase() : "",
                status: legality.status ? this.convertToLegalityStatus(legality.status).toLowerCase() : "",
            })) || [],
            artist: card.artist,
            oracleText: card.oracleText || "",
            setName: card.set?.name || "",
        });
        return response;
    }

    // static toLegalityEntities(dtos: CreateLegalityDto[]): Legality[] {
    //     return dtos?.reduce((entities: Legality[], dto: CreateLegalityDto) => {
    //         if (this.isValidLegalityDto(dto)) {
    //             const entity: Legality = this.toLegalityEntity(dto);
    //             if (entity) entities.push(entity);
    //         }
    //         return entities;
    //     }, []);
    // }

    // static toLegalityEntity(dto: CreateLegalityDto): Legality {
    //     return new Legality({
    //         cardId: dto.cardId,
    //         format: this.convertToFormat(dto.format),
    //         status: this.convertToLegalityStatus(dto.status),
    //     });
    // }

    // static toLegalityDtos(entities: Legality[]): CreateLegalityDto[] {
    //     return entities?.reduce((dtos: CreateLegalityDto[], entity: Legality) => {
    //         if (this.isValidLegalityEntity(entity)) {
    //             const dto: CreateLegalityDto = this.toLegalityDto(entity);
    //             if (dto) dtos.push(dto);
    //         }
    //         return dtos;
    //     }, []);
    // }

    // static toLegalityDto(entity: Legality): CreateLegalityDto {
    //     const dto: CreateLegalityDto = {
    //         cardId: entity?.cardId,
    //         format: entity?.format,
    //         status: entity?.status,
    //     };
    //     return dto;
    // }

    // private static fillMissingFormats(card: CardDto): CreateLegalityDto[] {
    //     const existingLegalities: CreateLegalityDto[] = card.legalities || [];
    //     const formats: Format[] = Object.values(Format);
    //     const filledLegalities: CreateLegalityDto[] = formats.map(format => {
    //         const existingLegality: CreateLegalityDto | undefined = existingLegalities.find(l => l.format === format);
    //         if (existingLegality) {
    //             return existingLegality;
    //         }
    //         const newLegality: CreateLegalityDto = {
    //             cardId: card.id,
    //             format: format,
    //             status: "Not Legal"
    //         }
    //         return newLegality;
    //     });
    //     return filledLegalities;
    // }



    private static manaForView(manaCost: string): string[] | null {
        return typeof manaCost === "string" ? manaCost
            .toLowerCase()
            .trim()
            .replaceAll("/", "")
            .replace("{", "")
            .replaceAll("}", "")
            .split("{")
            : null;
    }

    private static buildCardUrl(card: Card): string {
        return `/card/${card.setCode.toLowerCase()}/${card.number}`;
    }



    private static buildImgSrc(card: Card, size: CardImgType): string {
        return `${this.SCRYFALL_CARD_IMAGE_URL}/${size}/front/${card.imgSrc}`;
    }

    private static isValidLegalityDto(dto: LegalityResponseDto): boolean {
        return this.isValidlegality(dto?.format, dto?.status);
    }

    private static isValidLegalityEntity(entity: Legality): boolean {
        return this.isValidlegality(entity?.format, entity?.status);
    }

    private static isValidlegality(format: string, status: string): boolean {
        const validFormat: boolean = Object.values(Format).includes(format?.toLowerCase() as Format);
        const validStatus: boolean = Object.values(LegalityStatus).includes(status?.toLowerCase() as LegalityStatus);
        return validFormat && validStatus
    }

    private static convertToCardRarity(rarity: string): CardRarity {
        if (Object.values(CardRarity).includes(rarity as CardRarity)) {
            return rarity as CardRarity;
        }
        throw new Error(`Invalid rarity value: ${rarity}`);
    }

    private static convertToFormat(format: string): Format {
        if (Object.values(Format).includes(format as Format)) {
            return format as Format;
        }
        throw new Error(`Invalid format value: ${format}`);
    }

    private static convertToLegalityStatus(status: string): LegalityStatus {
        if (Object.values(LegalityStatus).includes(status as LegalityStatus)) {
            return status as LegalityStatus;
        }
        throw new Error(`Invalid status value: ${status}`);
    }
}