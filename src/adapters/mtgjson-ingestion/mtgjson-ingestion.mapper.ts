import { Injectable } from "@nestjs/common";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { Legalities } from "src/adapters/mtgjson-ingestion/dto/legalities.dto";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { SetDto as SetData } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";


@Injectable()
export class MtgJsonIngestionMapper {

    mapCoreSet(setMeta: SetData | SetList): Set {
        return new Set({
            code: setMeta.code.toLowerCase(),
            baseSize: setMeta.baseSetSize,
            block: setMeta.block,
            keyruneCode: setMeta.keyruneCode.toLowerCase(),
            name: setMeta.name,
            parentCode: setMeta.parentCode ? setMeta.parentCode.toLowerCase() : null,
            releaseDate: setMeta.releaseDate,
            type: setMeta.type,
        });
    }

    mapCoreCard(setCard: CardSet): Card {
        return new Card({
            id: setCard.uuid,
            artist: setCard.artist,
            hasFoil: setCard.hasFoil,
            hasNonFoil: setCard.hasNonFoil,
            imgSrc: this.buildScryfallImgPath(setCard),
            isReserved: setCard.isReserved,
            legalities: this.mapCoreLegalities(setCard.legalities, setCard.uuid),
            manaCost: setCard.manaCost,
            name: setCard.name,
            number: setCard.number,
            oracleText: setCard.text,
            rarity: setCard.rarity.toLowerCase() as CardRarity,
            setCode: setCard.setCode.toLowerCase(),
            type: setCard.type,
        });
    }

    mapCoreSets(setLists: SetList[]): Set[] {
        const sets: Set[] = [];
        setLists.forEach((s: SetList) => sets.push(this.mapCoreSet(s)));
        return sets;
    }

    mapCoreLegalities(legalities: Legalities, cardId: string): Legality[] {
        const coreLegalities: Legality[] = [];
        Object.entries(legalities).forEach(([format, status]) => {
            format = format.toLowerCase();
            status = status.toLowerCase();
            if (Object.values(Format).includes(format as Format)
                && Object.values(LegalityStatus).includes(status as LegalityStatus)) {
                coreLegalities.push(this.createLegality(format, status, cardId));
            }
        });
        return coreLegalities;
    }

    mapCorePrice(cardUuid: string, paperPrices: Record<string, PriceList>): Price | null {
        const extractedPrices: ExtractedPrices = this.extractPrices(paperPrices);
        const foilPrice: number | null = this.determinePrice(extractedPrices.foil);
        const normalPrice: number | null = this.determinePrice(extractedPrices.normal);
        if (!foilPrice && !normalPrice) {
            return null;
        }
        return new Price({
            cardId: cardUuid,
            foil: foilPrice,
            normal: normalPrice,
            date: new Date(this.extractDate(paperPrices)),
        });
    }

    private createLegality(format: string, status: string, cardId: string): Legality {
        return new Legality({
            format: format as Format,
            status: status as LegalityStatus,
            cardId,
        });
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

    private extractPrices(paperPrices: Record<string, PriceList>): ExtractedPrices {
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
        return new ExtractedPrices(foilPrices, normalPrices);
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

class ExtractedPrices {
    foil: number[];
    normal: number[];

    constructor(foil: number[], normal: number[]) {
        this.foil = foil;
        this.normal = normal;
    }
}