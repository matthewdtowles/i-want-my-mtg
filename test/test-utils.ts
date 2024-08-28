import { Set } from '../src/core/set/set.entity';
import { Card } from '../src/core/card/card.entity';
import { CreateCardDto } from '../src/core/card/dto/create-card.dto';
import { CardDto } from '../src/core/card/dto/card.dto';
import { CreateSetDto } from 'src/core/set/dto/create-set.dto';
import { SetDto } from 'src/core/set/dto/set.dto';
import { blob } from 'stream/consumers';

export class TestUtils {
    readonly MOCK_SET_CODE = 'SET';
    readonly MOCK_SET_NAME = 'Test Set';
    readonly MOCK_CARD_NAME = 'Test Card Name';
    readonly MOCK_SET_URL = 'sets/set';
    readonly MOCK_ROOT_SCRYFALL_ID = 'abc123def456';
    readonly IMG_SRC_BASE = 'https://cards.scryfall.io/normal/front/';
    readonly MOCK_SET_RELEASE_DATE = '2022-01-01';

    getMockCreateCardDtos(setCode: string): CreateCardDto[] {
        return Array.from({ length: 3 }, (_, i) => ({
            imgSrc: `${this.IMG_SRC_BASE}${i + 1}/a/${i + 1}${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
            isReserved: false,
            manaCost: `{${i + 1}}{W}`,
            name: `${this.MOCK_CARD_NAME} ${i + 1}`,
            number: `${i + 1}`,
            originalText: 'Test card text.',
            rarity: i % 2 === 0 ? 'common' : 'uncommon',
            setCode,
            url: `${this.MOCK_SET_URL}/${i + 1}`,
            uuid: `abcd-1234-efgh-5678-ijkl-${setCode}${i + 1}`,
        }));
    }

    getMockCards(setCode: string): Card[] {
        return this.getMockCreateCardDtos(setCode).map((dto, index) => ({
            ...dto,
            id: index + 1,
            manaCost: dto.manaCost,
            set: this.getMockSet(setCode),
        }));
    }

    getMockCardDtos(setCode: string): CardDto[] {
        return this.getMockCards(setCode).map(card => this.mapCardEntityToDto(card));
    }

    getMockSets(): Set[] {
        return this.getMockCreateSetDtos().map((dto, i) => ({
            ...dto,
            id: i + 1,
            setCode: dto.code,
            cards: undefined,
        }));    
    }

    getMockSet(setCode: string): Set {
        const set: Set = new Set();
        set.code = setCode;
        set.baseSize = 3;
        set.name = 'Test Set';
        set.releaseDate = '2022-01-01';
        set.type = 'expansion';
        return set;
    }

    getMockCreateSetDtos(): CreateSetDto[] {
        const setCodes: string[] = [
            this.MOCK_SET_CODE,
            'ETS',
            'TES',
        ];
        return Array.from({ length: 3}, (_, i) => ({
            baseSize: 3,
            block: this.MOCK_SET_NAME,
            code: setCodes[i],
            imgSrc: null,
            keyruneCode: this.MOCK_SET_CODE.toLowerCase(),
            name: this.MOCK_SET_NAME + i,
            parentCode: this.MOCK_SET_CODE,
            releaseDate: this.MOCK_SET_RELEASE_DATE,
            type: 'expansion',
            url: 'sets/' + setCodes[i]
        }));
    }

    getMockSetDtos(): SetDto[] {
        return this.getMockSets().map(set => this.mapSetEntityToDto(set));
    }

    mapCardEntityToDto(card: Card): CardDto {
        return {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.convertManaCost(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: card.rarity,
            setCode: card.set.code,
            url: card.url,
            uuid: card.uuid,
        };
    }

    mapCardEntitiesToDtos(cards: Card[]): CardDto[] {
        return cards.map(card => this.mapCardEntityToDto(card));
    }

    mapSetEntityToDto(set: Set): SetDto {
        return {
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? this.getMockCardDtos(set.code) : [],
            code: set.code,
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            type: set.type,
            url: 'sets/' + set.code.toLowerCase()
        };
    }

    mapSetEntitiesToDtos(sets: Set[]): SetDto[] {
        return sets.map(set => this.mapSetEntityToDto(set));
    }

    private convertManaCost(manaCost: string | undefined): string[] | undefined {
        return manaCost ? manaCost.toLowerCase().replace(/[{}]/g, '').split('') : undefined;
    }
}
