import { Injectable, Logger } from "@nestjs/common";
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
import { Provider } from "src/core/price/api/provider.enum";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";


@Injectable()
export class MtgJsonIngestionMapper {
    private readonly LOGGER: Logger = new Logger(MtgJsonIngestionMapper.name);

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
        if (!prices) {
            throw new Error(`Invalid AllPricesTodayFile`);
        }
        if (!prices.data) {
            throw new Error(`Invalid prices data`);
        }
        if (!prices.meta || !prices.meta.date) {
            throw new Error("Invalid prices meta data");
        }
        const dateStr: string = prices.meta.date;
        const _date: Date = new Date(dateStr);
        const uuids: string[] = Object.keys(prices.data);
        const priceDtos: CreatePriceDto[] = [];
        for (const uuid of uuids) {
            const priceFormats: PriceFormats = prices.data[uuid];
            if (!priceFormats) {
                this.LOGGER.warn(`No price formats for uuid ${uuid}`);
                continue;
            }
            if (!priceFormats.paper) {
                this.LOGGER.warn(`No paper prices for uuid ${uuid}`);
                continue;
            }
            Object.entries(priceFormats.paper).forEach(([_provider, priceList]) => {
                if (this.hasValidRetail(priceList)) {
                    const foilRecord: Record<string, number> = priceList.retail.foil;
                    const normalRecord: Record<string, number> = priceList.retail.normal;
                    priceDtos.push({
                        cardUuid: uuid,
                        foil: this.hasFoilPrice(priceList.retail) ? foilRecord[dateStr] : null,
                        normal: this.hasNormalPrice(priceList.retail) ? normalRecord[dateStr] : null,
                        date: _date,
                        provider: _provider as Provider,
                    });
                }
            });
        }
        return priceDtos;
    }

    private hasValidRetail(priceList: PriceList): boolean {
        return priceList && priceList.currency === "USD" && !!priceList.retail;
    }

    private hasNormalPrice(pricePoints: PricePoints): boolean {
        return pricePoints.normal && Object.keys(pricePoints.normal).length > 0;
    }

    private hasFoilPrice(pricePoints: PricePoints): boolean {
        return pricePoints.foil && Object.keys(pricePoints.foil).length > 0;
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
