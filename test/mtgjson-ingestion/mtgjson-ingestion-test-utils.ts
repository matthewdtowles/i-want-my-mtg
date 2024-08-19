import { CardSet } from '../../src/adapters/mtgjson-ingestion/dto/cardSet.dto'
import { SetDto } from '../../src/adapters/mtgjson-ingestion/dto/set.dto';
import { Identifiers } from '../../src/adapters/mtgjson-ingestion/dto/identifiers.dto';
import { SetList } from '../../src/adapters/mtgjson-ingestion/dto/setList.dto';
import { Set } from '../../src/core/set/set.entity';
import { Card } from '../../src/core/card/card.entity';

export class MtgJsonIngestionTestUtils {

    readonly MOCK_SET_CODE: string = 'SET';
    private readonly MOCK_BASE_SET_SIZE: number = 3;
    private readonly MOCK_SET_NAME: string = 'Setname';
    private readonly MOCK_RELEASE_DATE: string = '1970-01-01';
    private readonly MOCK_SET_TYPE: string = 'expansion';
    private readonly MOCK_SET_URL: string = 'sets/set';
    private readonly MOCK_ROOT_SCRYFALL_ID: string = 'abc123def456';
    private readonly IMG_SRC_BASE: string = 'https://cards.scryfall.io/normal/front/';

    getMockSet(): SetDto {
        let set: SetDto = new SetDto();
        set.baseSetSize = this.MOCK_BASE_SET_SIZE;
        set.block = this.MOCK_SET_NAME;
        set.cards = this.getMockCardSetArray();
        set.code = this.MOCK_SET_CODE;
        set.isFoilOnly = false;
        set.isNonFoilOnly = false;
        set.keyruneCode = this.MOCK_SET_CODE;
        set.name = this.MOCK_SET_NAME;
        set.releaseDate = this.MOCK_RELEASE_DATE;
        set.type = this.MOCK_SET_TYPE;
        return set;
    }

    getMockCardSetArray(): CardSet[] {
        let cards: CardSet[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            let card = new CardSet();
            card.identifiers = new Identifiers();
            card.isReserved = false;
            card.manaCost = '{' + i + '}{W}';
            card.name = 'Test Card Name' + i;
            card.number = i.toString();
            card.rarity = i % 2 === 1 ? 'common' : 'uncommon';
            card.identifiers.scryfallId = i + this.MOCK_ROOT_SCRYFALL_ID;
            card.originalText = 'Test card text.';
            card.setCode = this.MOCK_SET_CODE;
            card.uuid = 'abcd-1234-efgh-5678-ijkl-901' + i;
            cards.push(card);
        }
        let bonusCard = new CardSet();
        bonusCard.identifiers = new Identifiers();
        bonusCard.isReserved = false;
        bonusCard.manaCost = '{U/G}{B/W}{R/U}';
        bonusCard.name = 'Test Bonus Card Name';
        bonusCard.number = (this.MOCK_BASE_SET_SIZE + 1).toString();
        bonusCard.originalText = 'Bonus card text.';
        bonusCard.rarity = 'mythic'
        bonusCard.identifiers.scryfallId = bonusCard.number + this.MOCK_ROOT_SCRYFALL_ID;
        bonusCard.setCode = this.MOCK_SET_CODE;
        bonusCard.uuid = 'zyxw-0987-vutsr-6543-qponm-21098';
        cards.push(bonusCard);
        return cards;
    }

    getMockSetListArray(): SetList[] {
        let setList: SetList[] = [];
        let set: SetList = new SetList();
        set.baseSetSize = this.MOCK_BASE_SET_SIZE;
        set.block = this.MOCK_SET_NAME;
        set.code = this.MOCK_SET_CODE;
        set.isFoilOnly = false;
        set.isNonFoilOnly = false;
        set.keyruneCode = this.MOCK_SET_CODE;
        set.name = this.MOCK_SET_NAME;
        set.releaseDate = this.MOCK_RELEASE_DATE;
        set.type = this.MOCK_SET_TYPE;
        setList.push(set);
        return setList;
    }

    getExpectedCards(): Card[] {
        const cards: Card[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            let card = new Card();
            card.imgSrc = this.IMG_SRC_BASE + i + '/' + 'a/' + i + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
            card.isReserved = false;
            card.manaCost = '{' + i + '}{W}';
            card.name = 'Test Card Name' + i;
            card.number = i.toString();
            card.originalText = 'Test card text.';
            card.uuid = 'abcd-1234-efgh-5678-ijkl-901' + i;
            card.rarity = i % 2 === 1 ? 'common' : 'uncommon';
            card.url = this.MOCK_SET_URL + '/' + i;
            cards.push(card);
        }
        let bonusCard = new Card();
        bonusCard.imgSrc = this.IMG_SRC_BASE + '4/a/4' + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
        bonusCard.isReserved = false;
        bonusCard.manaCost = '{U/G}{B/W}{R/U}';
        bonusCard.name = 'Test Bonus Card Name';
        bonusCard.number = (this.MOCK_BASE_SET_SIZE + 1).toString();
        bonusCard.originalText = 'Bonus card text.';
        bonusCard.rarity = 'mythic';
        bonusCard.url = this.MOCK_SET_URL + '/' + bonusCard.number;
        bonusCard.uuid = 'zyxw-0987-vutsr-6543-qponm-21098';
        cards.push(bonusCard);
        return cards;
    }

    getExpectedSet(): Set {
        const expectedSet: Set = new Set();
        expectedSet.baseSize = this.MOCK_BASE_SET_SIZE;
        expectedSet.block = this.MOCK_SET_NAME;
        expectedSet.cards = [];
        expectedSet.keyruneCode = this.MOCK_SET_CODE.toLowerCase();
        expectedSet.name = this.MOCK_SET_NAME;
        expectedSet.releaseDate = this.MOCK_RELEASE_DATE;
        expectedSet.setCode = this.MOCK_SET_CODE;
        expectedSet.type = this.MOCK_SET_TYPE;
        return expectedSet;
    }

    // single item array for testing purposes
    getExpectedSets(): Set[] {
        const expectedSets: Set[] = [];
        expectedSets.push(this.getExpectedSet());
        return expectedSets;
    }
}