import { Injectable } from "@nestjs/common";
import { CreateCardDto } from "src/core/card/api/card.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { CardSet } from "./dto/cardSet.dto";
import { SetDto as SetData } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";

@Injectable()
export class MtgJsonIngestionMapper {

    toCreateSetDto(setMeta: SetData | SetList): CreateSetDto {
        const set: CreateSetDto = {
            code: setMeta.code.toLowerCase(),
            baseSize: setMeta.baseSetSize,
            block: setMeta.block,
            keyruneCode: setMeta.keyruneCode.toLowerCase(),
            name: setMeta.name,
            parentCode: setMeta.parentCode ? setMeta.parentCode.toLowerCase() : null,
            releaseDate: setMeta.releaseDate,
            type: setMeta.type,
        };
        return set;
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

    private toCreateCardDto(setCard: CardSet): CreateCardDto {
        return {
            artist: setCard.artist,
            imgSrc: this.buildCardImgSrc(setCard),
            isReserved: setCard.isReserved,
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
