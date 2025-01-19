import { Injectable, Logger } from "@nestjs/common";
import { CreateCardDto } from "src/core/card/api/card.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { CardSet } from "./dto/cardSet.dto";
import { SetDto as SetData } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";
import { Legalities } from "src/adapters/mtgjson-ingestion/dto/legalities.dto";
import { Format, LegalityDto, LegalityStatus } from "src/core/card/api/legality.dto";

@Injectable()
export class MtgJsonIngestionMapper {
    private readonly LOGGER = new Logger(MtgJsonIngestionMapper.name);

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
        this.LOGGER.debug(`toCreateCardDtos 2: ${JSON.stringify(cards[0])}`);
        return cards;
    }

    toCreateSetDtos(setLists: SetList[]): CreateSetDto[] {
        const sets: CreateSetDto[] = [];
        setLists.forEach((s: SetList) => {
            sets.push(this.toCreateSetDto(s));
        });
        return sets;
    }

    toCreateCardDto(setCard: CardSet): CreateCardDto {
        this.LOGGER.debug(`toCreateCardDto: ${JSON.stringify(setCard)}`);
        return {
            artist: setCard.artist,
            imgSrc: this.buildCardImgSrc(setCard),
            isReserved: setCard.isReserved,
            legalities: this.toLegalityDtos(setCard.legalities),
            manaCost: setCard.manaCost,
            name: setCard.name,
            number: setCard.number,
            oracleText: setCard.text,
            rarity: setCard.rarity,
            setCode: setCard.setCode.toLowerCase(),
            uuid: setCard.uuid,
            type: setCard.type,
        };
    }

    toLegalityDtos(legalities: Legalities): LegalityDto[] {
        const legalitiesDto: LegalityDto[] = [];
        Object.entries(legalities).forEach(([format, status]) => {
            this.LOGGER.debug(`toLegalityDtos: f/s: ${format}/${status}`);
            if (this.isValidFormat(format) && this.isValidStatus(status)) {
                this.LOGGER.debug(`toLegalityDtos: f/s: ${format}/${status} is valid`);
                legalitiesDto.push(this.createLegalityDto(format, status));
            }
        });
        this.LOGGER.debug(`toLegalityDtos: ${JSON.stringify(legalitiesDto)}`);
        return legalitiesDto;
    }

    isValidFormat(format: string): boolean {
        const valid: boolean = Object.values(Format).includes(format.toLowerCase() as Format);
        this.LOGGER.debug(`isValidFormat: ${format} is ${valid}`);
        return valid;
    }

    isValidStatus(status: string): boolean {
        status = status.toLowerCase();
        const valid: boolean = Object.values(LegalityStatus).includes(status as LegalityStatus);
        this.LOGGER.debug(`isValidStatus: ${status} is ${valid}`);
        return valid;
    }

    createLegalityDto(format: string, status: string): LegalityDto {
        return {
            format: format as Format,
            status: status as LegalityStatus,
            cardId: null,
        };
    }

    buildCardImgSrc(card: CardSet): string {
        return this.buildScryfallImgPath(card);
    }

    buildScryfallImgPath(card: CardSet): string {
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
