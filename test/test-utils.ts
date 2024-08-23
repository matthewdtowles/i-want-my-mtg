import { Set } from '../src/core/set/set.entity';
import { Card } from '../src/core/card/card.entity';
import { CreateCardDto } from '../src/core/card/dto/create-card.dto';
import { CardDto } from '../src/core/card/dto/card.dto';

export class TestUtils {
    readonly MOCK_SET_CODE = 'SET';
    readonly MOCK_CARD_NAME = 'Test Card Name';
    readonly MOCK_SET_URL = 'sets/set';
    readonly MOCK_ROOT_SCRYFALL_ID = 'abc123def456';
    readonly IMG_SRC_BASE = 'https://cards.scryfall.io/normal/front/';

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
        return this.getMockCards(setCode).map(card => this.mapEntityToDto(card));
    }

    getMockSet(setCode: string): Set {
        const set = new Set();
        set.setCode = setCode;
        set.baseSize = 3;
        set.name = 'Test Set';
        set.releaseDate = '2022-01-01';
        set.type = 'expansion';
        return set;
    }

    mapEntityToDto(card: Card): CardDto {
        return {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.convertManaCost(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: card.rarity,
            setCode: card.set.setCode,
            url: card.url,
            uuid: card.uuid,
        };
    }

    mapEntitiesToDtos(cards: Card[]): CardDto[] {
        return cards.map(card => this.mapEntityToDto(card));
    }

    private convertManaCost(manaCost: string | undefined): string[] | undefined {
        return manaCost ? manaCost.toLowerCase().replace(/[{}]/g, '').split('') : undefined;
    }
}
