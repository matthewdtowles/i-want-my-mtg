import { Injectable } from "@nestjs/common";
import { AllPricesTodayFile } from "src/adapters/mtgjson-ingestion/dto/allPricesTodayFile.dto";
import { Legalities } from "src/adapters/mtgjson-ingestion/dto/legalities.dto";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { Format } from "src/core/card/api/format.enum";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { CardSet } from "./dto/cardSet.dto";
import { SetDto as SetData } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";
import { PriceFormats } from "src/adapters/mtgjson-ingestion/dto/priceFormats.dto";


@Injectable()
export class MtgJsonIngestionMapper {

    toCreateSetDto(setMeta: SetData | SetList): CreateSetDto {
        return {
            code: setMeta.code.toLowerCase(),
            baseSize: setMeta.baseSetSize,
            block: setMeta.block,
            keyruneCode: setMeta.keyruneCode.toLowerCase(),
            name: setMeta.name,
            parentCode: setMeta.parentCode ? setMeta.parentCode.toLowerCase() : null,
            releaseDate: setMeta.releaseDate,
            type: setMeta.type,
        };
    }

    toCreateCardDtos(setCards: CardSet[]): CreateCardDto[] {
        const cards: CreateCardDto[] = [];
        setCards.forEach((c: CardSet) => {
            cards.push(this.toCreateCardDto(c));
        });
        return cards;
    }

    toCreateSetDtos(setLists: SetList[]): CreateSetDto[] {
        const sets: CreateSetDto[] = [];
        setLists.forEach((s: SetList) => {
            sets.push(this.toCreateSetDto(s));
        });
        return sets;
    }

    toLegalityDtos(legalities: Legalities): LegalityDto[] {
        const legalitiesDto: LegalityDto[] = [];
        Object.entries(legalities).forEach(([format, status]) => {
            format = format.toLowerCase();
            status = status.toLowerCase();
            if (this.isValidFormat(format) && this.isValidStatus(status)) {
                legalitiesDto.push(this.createLegalityDto(format, status));
            }
        });
        return legalitiesDto;
    }

    toCreatePriceDtos(prices: AllPricesTodayFile): CreatePriceDto[] {
        if (!prices || !prices.data) {
            throw new Error("Invalid prices data");
        }
        if (!prices.meta || !prices.meta.date) {
            throw new Error("Invalid prices meta data");
        }
        const uuids: string[] = Object.keys(prices.data);
        for (const uuid of uuids) {
            const priceFormats: PriceFormats = prices.data[uuid];
            if (!priceFormats) {
                throw new Error(`Invalid price format for uuid ${uuid}`);
            }
            const priceDtos: CreatePriceDto[] = [];
            Object.entries(priceFormats).forEach(([provider, priceList]) => {
                if (priceList && priceList.currency === "USD" && priceList.retail) {
                    const foilRecord: Record<string, number> = priceList.retail.foil;
                    const normalRecord: Record<string, number> = priceList.retail.normal;
                    const _date: Date = new Date(foilRecord.key);
                    priceDtos.push({
                        cardUuid: uuid,
                        foil: foilRecord.value,
                        normal: normalRecord.value,
                        date: _date,
                    });
                }
            });
            return priceDtos;
        }
    }

    private toCreateCardDto(setCard: CardSet): CreateCardDto {
        return {
            artist: setCard.artist,
            imgSrc: this.buildCardImgSrc(setCard),
            isReserved: setCard.isReserved,
            legalities: this.toLegalityDtos(setCard.legalities),
            manaCost: setCard.manaCost,
            name: setCard.name,
            number: setCard.number,
            oracleText: setCard.text,
            rarity: setCard.rarity.toLowerCase(),
            setCode: setCard.setCode.toLowerCase(),
            uuid: setCard.uuid,
            type: setCard.type,
        };
    }

    private createLegalityDto(format: string, status: string): LegalityDto {
        return {
            format: format as Format,
            status: status as LegalityStatus,
            cardId: null,
        };
    }

    private isValidFormat(format: string): boolean {
        return Object.values(Format).includes(format as Format);
    }

    private isValidStatus(status: string): boolean {
        return Object.values(LegalityStatus).includes(status as LegalityStatus);
    }

    private buildCardImgSrc(card: CardSet): string {
        return this.buildScryfallImgPath(card);
    }

    private buildScryfallImgPath(card: CardSet): string {
        if (!card.identifiers) {
            throw new Error(`Card ${card.name} has no identifiers`);
        }
        if (!card.identifiers.scryfallId) {
            throw new Error(`Card ${card.name} has no scryfallId`);
        }
        const scryfallId: string = card.identifiers.scryfallId;
        return `${scryfallId.charAt(0)}/${scryfallId.charAt(1)}/${scryfallId}.jpg`;
    }
}
