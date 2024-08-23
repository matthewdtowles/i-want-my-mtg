import { CardSet } from '../../src/adapters/mtgjson-ingestion/dto/cardSet.dto';
import { Identifiers } from '../../src/adapters/mtgjson-ingestion/dto/identifiers.dto';
import { SetDto } from '../../src/adapters/mtgjson-ingestion/dto/set.dto';
import { SetList } from '../../src/adapters/mtgjson-ingestion/dto/setList.dto';
import { CreateCardDto } from '../../src/core/card/dto/create-card.dto';
import { CreateSetDto } from '../../src/core/set/dto/create-set.dto';

export class MtgJsonIngestionTestUtils {

    readonly MOCK_SET_CODE: string = 'SET';
    private readonly MOCK_BASE_SET_SIZE: number = 3;
    private readonly MOCK_SET_NAME: string = 'Setname';
    private readonly MOCK_RELEASE_DATE: string = '1970-01-01';
    private readonly MOCK_SET_TYPE: string = 'expansion';
    private readonly MOCK_SET_URL: string = 'sets/set';
    private readonly MOCK_ROOT_SCRYFALL_ID: string = 'abc123def456';
    private readonly IMG_SRC_BASE: string = 'https://cards.scryfall.io/normal/front/';

    getMockSetDto(): SetDto {
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

    getExpectedCreateCardDtos(): CreateCardDto[] {
        const cards: CreateCardDto[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            const card: CreateCardDto = {
                imgSrc: this.IMG_SRC_BASE + i + '/' + 'a/' + i + this.MOCK_ROOT_SCRYFALL_ID + '.jpg',
                isReserved: false,
                manaCost: '{' + i + '}{W}',
                name: 'Test Card Name' + i,
                number: i.toString(),
                originalText: 'Test card text.',
                rarity: i % 2 === 1 ? 'common' : 'uncommon',
                setCode: this.MOCK_SET_CODE,
                uuid: 'abcd-1234-efgh-5678-ijkl-901' + i,
                url: this.MOCK_SET_URL + '/' + i,
            };
            cards.push(card);
        }
        const bonusCard: CreateCardDto = {
            imgSrc: this.IMG_SRC_BASE + '4/a/4' + this.MOCK_ROOT_SCRYFALL_ID + '.jpg',
            isReserved: false,
            manaCost: '{U/G}{B/W}{R/U}',
            name: 'Test Bonus Card Name',
            number: (this.MOCK_BASE_SET_SIZE + 1).toString(),
            originalText: 'Bonus card text.',
            rarity: 'mythic',
            setCode: this.MOCK_SET_CODE,
            uuid: 'zyxw-0987-vutsr-6543-qponm-21098',
            url: this.MOCK_SET_URL + '/' + (this.MOCK_BASE_SET_SIZE + 1).toString(),
        };
        cards.push(bonusCard);
        return cards;
    }

    getExpectedCreateSetDto(): CreateSetDto {
        const expectedSet: CreateSetDto = {
            baseSize: this.MOCK_BASE_SET_SIZE,
            block: this.MOCK_SET_NAME,
            keyruneCode: this.MOCK_SET_CODE.toLowerCase(),
            name: this.MOCK_SET_NAME,
            releaseDate: this.MOCK_RELEASE_DATE,
            code: this.MOCK_SET_CODE,
            type: this.MOCK_SET_TYPE,
            url: this.MOCK_SET_URL
        };
        return expectedSet;
    }

    // single item array for testing purposes
    getExpectedCreateSetDtos(): CreateSetDto[] {
        const expectedSets: CreateSetDto[] = [];
        expectedSets.push(this.getExpectedCreateSetDto());
        return expectedSets;
    }
}