import { Injectable } from '@nestjs/common';
import { CreateCardDto } from 'src/core/card/dto/create-card.dto';
import { CreateSetDto } from 'src/core/set/dto/create-set.dto';
import { CardSet } from './dto/cardSet.dto';
import { SetDto as SetData } from './dto/set.dto';
import { SetList } from './dto/setList.dto';

@Injectable()
export class MtgJsonMapperService {

    private readonly SCRYFALL_CARD_IMAGE_URL: string = 'https://cards.scryfall.io/';
    private readonly SCRYFALL_CARD_IMAGE_FORMATS: string[] = ['small', 'normal', 'large', 'art_crop'];
    private readonly SCRYFALL_CARD_IMAGE_SIDES: string[] = ['front', 'back'];
    private readonly GATHERER_CARD_IMAGE_URL: string = 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=';

    externalToCreateSetDto(setMeta: SetData | SetList): CreateSetDto {
        const set: CreateSetDto = {
            code: setMeta.code,
            baseSize: setMeta.baseSetSize,
            block: setMeta.block,
            keyruneCode: setMeta.keyruneCode.toLowerCase(),
            name: setMeta.name,
            parentCode: setMeta.parentCode,
            releaseDate: setMeta.releaseDate,
            type: setMeta.type,
            url: this.buildSetUrl(setMeta.code),
        }
        return set;
    }

    externalToCreateCardDtos(setCards: CardSet[]): CreateCardDto[] {
        const cards: CreateCardDto[] = [];
        setCards.forEach(c => {
            cards.push(this.externalToCreateCardDto(c));
        });
        return cards;
    }

    externalToCreateSetDtos(setLists: SetList[]): CreateSetDto[] {
        const sets: CreateSetDto[] = [];
        setLists.forEach(s => {
            sets.push(this.externalToCreateSetDto(s));
        })
        return sets;
    }

    private externalToCreateCardDto(setCard: CardSet): CreateCardDto {
        const card: CreateCardDto = {
            imgSrc: this.buildCardImgSrc(setCard),
            isReserved: setCard.isReserved,
            manaCost: setCard.manaCost,
            name: setCard.name,
            number: setCard.number,
            originalText: setCard.originalText,
            rarity: setCard.rarity,
            setCode: setCard.setCode,
            url: this.buildCardUrl(setCard),
            uuid: setCard.uuid,
        }
        return card;
    }

    private buildCardUrl(card: CardSet): string {
        return this.buildSetUrl(card.setCode) + '/' + card.number;
    }

    private buildCardImgSrc(card: CardSet): string {
        return this.buildScryfallImgPath(card);
    }

    private buildScryfallImgPath(card: CardSet): string {
        // TODO: handle NPE
        const scryfallId: string = card.identifiers.scryfallId;
        return this.SCRYFALL_CARD_IMAGE_URL + 'normal/front/' + scryfallId.charAt(0) + '/' 
            + scryfallId.charAt(1) + '/' + scryfallId + '.jpg';
    }

    private buildMultiverseImgPath(card: CardSet): string {
        // TODO: handle NPE
        return this.GATHERER_CARD_IMAGE_URL + card.identifiers.multiverseId;
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }

    private getTotalOwned(card: CardSet) {
        // TODO: impl
        return 0;
    }

    private getNotes(card: CardSet): string[] {
        // TODO: impl
        return [];
    }

    private getPrice(card: CardSet): number {
        // TODO: impl
        return 0.00;
    }

}
