import { Logger } from "@nestjs/common";
import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { LegalityResponseDto } from "src/adapters/http/card/dto/legality.response.dto";
import { SingleCardResponseDto } from "src/adapters/http/card/dto/single-card.response.dto";
import { InventoryQuantities } from "src/adapters/http/inventory/inventory.quantities";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { Price } from "src/core/price/price.entity";
import { toDollar } from "src/shared/utils/formatting.util";

export class CardPresenter {
    private static readonly LOGGER: Logger = new Logger(CardPresenter.name);

    private static readonly BASE_IMAGE_URL: string = "https://cards.scryfall.io";

    static toCardResponse(
        card: Card,
        inventory: InventoryQuantities,
        imageType: CardImgType = CardImgType.SMALL
    ): CardResponseDto {
        if (!card) {
            this.LOGGER.error("Card is required to create CardResponseDto");
            throw new Error("Card is required to create CardResponseDto");
        }
        const price: Price | undefined = card.prices ? card.prices[0] : undefined;
        return new CardResponseDto({
            cardId: card.id,
            hasFoil: card.hasFoil,
            hasNormal: card.hasNonFoil,
            imgSrc: this.buildImgSrc(card, imageType),
            isReserved: card.isReserved,
            manaCost: card.manaCost ? this.manaForView(card.manaCost) : [],
            name: card.name,
            number: card.number,
            rarity: this.convertToCardRarity(card.rarity).toLowerCase(),
            setCode: card.setCode,
            type: card.type,
            url: this.buildCardUrl(card),
            foilPrice: toDollar(price?.foil),
            foilQuantity: card.hasFoil && inventory?.foilQuantity ? inventory.foilQuantity : 0,
            normalPrice: toDollar(price?.normal),
            normalQuantity: card.hasNonFoil && inventory?.normalQuantity ? inventory.normalQuantity : 0,
        });
    }

    static toSingleCardResponse(
        card: Card,
        inventory: InventoryQuantities,
        imageType: CardImgType
    ): SingleCardResponseDto {
        return new SingleCardResponseDto({
            ...this.toCardResponse(card, inventory, imageType),
            legalities: this.fillMissingFormats(card),
            artist: card.artist,
            oracleText: card.oracleText || "",
            setName: card.set?.name || "",
        });
    }

    static toLegalityDtos(entities: Legality[]): LegalityResponseDto[] {
        return entities?.reduce((dtos: LegalityResponseDto[], entity: Legality) => {
            if (this.isValidLegalityEntity(entity)) {
                const dto: LegalityResponseDto = this.toLegalityDto(entity);
                if (dto) dtos.push(dto);
            }
            return dtos;
        }, []);
    }

    static toLegalityDto(entity: Legality): LegalityResponseDto {
        const dto: LegalityResponseDto = {
            cardId: entity?.cardId,
            format: entity?.format,
            status: entity?.status,
        };
        return dto;
    }

    private static fillMissingFormats(card: Card): LegalityResponseDto[] {
        const existingLegalities: LegalityResponseDto[] = card.legalities || [];
        const formats: Format[] = Object.values(Format);
        const filledLegalities: LegalityResponseDto[] = formats.map(format => {
            const existingLegality: LegalityResponseDto | undefined = existingLegalities.find(l => l.format === format);
            return existingLegality ? existingLegality : new LegalityResponseDto({
                cardId: card.id,
                format: format,
                status: "Not Legal"
            });
        });
        return filledLegalities;
    }

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
        return `${this.BASE_IMAGE_URL}/${size}/front/${card.imgSrc}`;
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
        this.LOGGER.error(`Invalid rarity value: ${rarity}`);
        throw new Error(`Invalid rarity value: ${rarity}`);
    }
}