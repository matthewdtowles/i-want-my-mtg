import { Set } from '../src/core/set/set';
import { Card } from '../src/core/card/card';

export class TestUtils {

    readonly MOCK_BASE_SET_SIZE: number = 3;
    readonly MOCK_CARD_NAME: string = 'Test Card Name';
    readonly MOCK_SET_CODE: string = 'SET';
    private readonly MOCK_SET_NAME: string = 'Setname';
    private readonly MOCK_RELEASE_DATE: string = '1970-01-01';
    private readonly MOCK_SET_TYPE: string = 'expansion';
    private readonly MOCK_SET_URL: string = 'sets/set';
    private readonly MOCK_ROOT_SCRYFALL_ID: string = 'abc123def456';
    private readonly IMG_SRC_BASE: string = 'https://cards.scryfall.io/normal/front/';

    getMockSetCards(setCode: string): Card[] {
        const cards: Card[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            cards.push(this.getMockCard(i, setCode));
        }
        let bonusCard = new Card();
        bonusCard.id = 101;
        bonusCard.imgSrc = this.IMG_SRC_BASE + '4/a/4' + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
        bonusCard.isReserved = false;
        bonusCard.manaCost = '{U/G}{B/W}{R/U}';
        bonusCard.name = 'Test Bonus Card Name';
        bonusCard.number = String(this.MOCK_BASE_SET_SIZE + 1);
        bonusCard.originalText = 'Bonus card text.';
        bonusCard.rarity = 'mythic';
        bonusCard.set = this.getMockSet(setCode);
        bonusCard.url = this.MOCK_SET_URL + '/' + bonusCard.number;
        bonusCard.uuid = 'zyxw-0987-vutsr-6543-qponm-21098';
        cards.push(bonusCard);
        return cards;
    }

    getMockSet(setCode: string): Set {
        const set: Set = new Set();
        set.baseSize = this.MOCK_BASE_SET_SIZE;
        set.block = this.MOCK_SET_NAME;
        set.keyruneCode = setCode.toLowerCase();
        set.name = this.MOCK_SET_NAME;
        set.releaseDate = this.MOCK_RELEASE_DATE;
        set.setCode = setCode;
        set.type = this.MOCK_SET_TYPE;
        return set;
    }

    getMockSets(): Set[] {
        const sets: Set[] = [];
        sets.push(this.getMockSet(this.MOCK_SET_NAME));
        sets.push(this.getMockSet('TES'));
        sets.push(this.getMockSet('ETS'));
        return sets;
    }

    getMockCardsWithName(total: number): Card[] {
        const cards: Card[] = [];
        for (let i = 0; i < total; i++) {
            const s: string = String(i);
            const setCode: string = s + s + s;
            const card: Card = new Card();
            card.imgSrc = this.IMG_SRC_BASE + s+ '/' + 'a/' + s + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
            card.isReserved = false;
            card.manaCost = '{' + s + '}{W}';
            card.name = this.MOCK_CARD_NAME;
            card.number = String(i);
            card.originalText = 'Test card text.';
            card.uuid = 'abcd-1234-efgh-5678-ijkl-' + setCode + s;
            card.rarity = i % 2 === 1 ? 'common' : 'uncommon';
            card.set = this.getMockSet(setCode);
            card.url = this.MOCK_SET_URL + '/' + s;
            cards.push(card);
        }
        return cards;
    }

    getMockCard(setNumber: number, setCode: string): Card {
        const card = this.getMockInputCard(setNumber, setCode);
        card.id = setNumber;
        return card;
    }

    getMockInputCard(setNumber: number, setCode: string): Card {
        const card = new Card();
        card.imgSrc = this.IMG_SRC_BASE + setNumber + '/' + 'a/' + setNumber + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
        card.isReserved = false;
        card.manaCost = '{' + setNumber + '}{W}';
        card.name = this.MOCK_CARD_NAME + setNumber;
        card.number = String(setNumber);
        card.originalText = 'Test card text.';
        card.uuid = 'abcd-1234-efgh-5678-ijkl-' + setCode + setNumber;
        card.rarity = setNumber % 2 === 1 ? 'common' : 'uncommon';
        card.set = this.getMockSet(setCode);
        card.url = this.MOCK_SET_URL + '/' + setNumber;
        return card;    
    }
}