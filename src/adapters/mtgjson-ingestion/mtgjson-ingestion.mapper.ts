import { Injectable } from "@nestjs/common";
import { Legalities } from "src/adapters/mtgjson-ingestion/dto/legalities.dto";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { CreateCardDto, CreateLegalityDto, Format, LegalityStatus } from "src/core/card";
import { CreatePriceDto } from "src/core/price";
import { CreateSetDto } from "src/core/set";
import { CardSet } from "./dto/cardSet.dto";
import { SetDto as SetData } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";


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

    toCreateCardDto(setCard: CardSet): CreateCardDto {
        return {
            artist: setCard.artist,
            hasFoil: setCard.hasFoil,
            hasNonFoil: setCard.hasNonFoil,
            imgSrc: this.buildScryfallImgPath(setCard),
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

    toCreateSetDtos(setLists: SetList[]): CreateSetDto[] {
        const sets: CreateSetDto[] = [];
        setLists.forEach((s: SetList) => {
            sets.push(this.toCreateSetDto(s));
        });
        return sets;
    }

    toLegalityDtos(legalities: Legalities): CreateLegalityDto[] {
        const legalitiesDto: CreateLegalityDto[] = [];
        Object.entries(legalities).forEach(([format, status]) => {
            format = format.toLowerCase();
            status = status.toLowerCase();

            if (Object.values(Format).includes(format as Format)
                && Object.values(LegalityStatus).includes(status as LegalityStatus)) {
                legalitiesDto.push(this.createLegalityDto(format, status));
            }
        });
        return legalitiesDto;
    }

    toCreatePriceDto(cardUuid: string, paperPrices: Record<string, PriceList>): CreatePriceDto {
        const extractedPrices: ExtractedPricesDto = this.extractPrices(paperPrices);
        const foilPrice: number | null = this.determinePrice(extractedPrices.foil);
        const normalPrice: number | null = this.determinePrice(extractedPrices.normal);
        let priceDto: CreatePriceDto;
        if (foilPrice || normalPrice) {
            priceDto = {
                cardUuid,
                date: new Date(this.extractDate(paperPrices)),
                foil: foilPrice,
                normal: normalPrice,
            };
        }
        return priceDto;
    }

    private createLegalityDto(format: string, status: string): CreateLegalityDto {
        return {
            format: format as Format,
            status: status as LegalityStatus,
            cardId: null,
        };
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

    private extractDate(paperPrices: Record<string, PriceList>): string {
        for (const [_, priceList] of Object.entries(paperPrices)) {
            if (!priceList || !priceList.retail) continue;
            const pricePoints: PricePoints = priceList.retail;
            let dateStr: string = Object.keys(pricePoints.normal || {})[0];
            if (!dateStr) {
                dateStr = Object.keys(pricePoints.foil || {})[0];
            }
            if (dateStr) {
                return dateStr;
            }
        }
        throw new Error("No date found in paper prices");
    }

    private extractPrices(paperPrices: Record<string, PriceList>): ExtractedPricesDto {
        const foilPrices: number[] = [];
        const normalPrices: number[] = [];
        for (const [_, priceList] of Object.entries(paperPrices)) {
            if (!priceList || !priceList.retail) continue;
            if (priceList.currency !== "USD") continue;
            const pricePoints: PricePoints = priceList.retail;
            if (pricePoints.foil) {
                for (const [_, foilPrice] of Object.entries(pricePoints.foil)) {
                    foilPrices.push(foilPrice);
                }
            }
            if (pricePoints.normal) {
                for (const [_, normalPrice] of Object.entries(pricePoints.normal)) {
                    normalPrices.push(normalPrice);
                }
            }
        }
        return new ExtractedPricesDto(foilPrices, normalPrices);
    }

    private determinePrice(prices: number[]): number | null {
        const total: number = prices.reduce((acc, price) => acc + price, 0);
        const avg: number = total / prices.length;
        if (isNaN(avg) || avg === 0) {
            return null;
        }
        return Math.ceil(avg * 100) / 100; // Round to hundredths
    }
}

class ExtractedPricesDto {
    foil: number[];
    normal: number[];

    constructor(foil: number[], normal: number[]) {
        this.foil = foil;
        this.normal = normal;
    }
}