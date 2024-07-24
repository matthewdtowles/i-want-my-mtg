import { CardSet } from './models/cardSet.model';
import { Set } from './models/set.model';
import { Identifiers } from './models/identifiers.model';
import { CreateCardDto } from '../core/card/dto/create-card.dto';
import { CreateSetDto } from '../core/set/dto/create-set.dto';
import { SetList } from './models/setList.model';

export class MtgJsonIngestionTestUtils {

    readonly MOCK_SET_CODE: string = 'SET';
    private readonly MOCK_BASE_SET_SIZE: number = 3;
    private readonly MOCK_SET_NAME: string = 'Setname';
    private readonly MOCK_RELEASE_DATE: string = '1970-01-01';
    private readonly MOCK_SET_TYPE: string = 'expansion';
    private readonly MOCK_DTO_URL: string = 'sets/set';
    private readonly MOCK_ROOT_SCRYFALL_ID: string = 'abc123def456';
    private readonly MOCK_CARD_PRICE: number = 0;
    private readonly MOCK_TOTAL_OWNED: number = 0;
    private readonly IMG_SRC_BASE: string = 'https://cards.scryfall.io/normal/front/';

    getMockSet(): Set {
        let set: Set = new Set();
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
            card.manaCost = '{' + i + '}{W}';
            card.name = 'Test Card Name' + i;
            card.number = i.toString();
            card.rarity = i % 2 === 1 ? 'common' : 'uncommon';
            card.identifiers.scryfallId = i + this.MOCK_ROOT_SCRYFALL_ID;
            card.setCode = this.MOCK_SET_CODE;
            cards.push(card);
        }
        let card = new CardSet();
        card.identifiers = new Identifiers();
        card.manaCost = '{U/G}{B/W}{R/U}';
        card.name = 'Test Bonus Card Name';
        card.number = (this.MOCK_BASE_SET_SIZE + 1).toString();
        card.rarity = 'mythic'
        card.identifiers.scryfallId = card.number + this.MOCK_ROOT_SCRYFALL_ID;
        card.setCode = this.MOCK_SET_CODE;
        cards.push(card);
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

    getExpectedCardDtos(): CreateCardDto[] {
        const cardDtos: CreateCardDto[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            let cardDto = new CreateCardDto();
            cardDto.imgSrc = this.IMG_SRC_BASE + i + '/' + 'a/' + i + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
            cardDto.manaCost = '{' + i + '}{W}';
            cardDto.name = 'Test Card Name' + i;
            cardDto.notes = [];
            cardDto.number = i.toString();
            cardDto.price = this.MOCK_CARD_PRICE;
            cardDto.rarity = i % 2 === 1 ? 'common' : 'uncommon';
            cardDto.setCode = this.MOCK_SET_CODE;
            cardDto.totalOwned = this.MOCK_TOTAL_OWNED;
            cardDto.url = this.MOCK_DTO_URL + '/' + i;
            cardDtos.push(cardDto);
        }
        let cardDto = new CreateCardDto();
        cardDto.imgSrc = this.IMG_SRC_BASE + '4/a/4' + this.MOCK_ROOT_SCRYFALL_ID + '.jpg';
        cardDto.manaCost = '{U/G}{B/W}{R/U}';
        cardDto.name = 'Test Bonus Card Name';
        cardDto.notes = [];
        cardDto.number = (this.MOCK_BASE_SET_SIZE + 1).toString();
        cardDto.price = this.MOCK_CARD_PRICE;
        cardDto.rarity = 'mythic';
        cardDto.setCode = this.MOCK_SET_CODE;
        cardDto.totalOwned = this.MOCK_TOTAL_OWNED;
        cardDto.url = this.MOCK_DTO_URL + '/' + cardDto.number;
        cardDtos.push(cardDto);
        return cardDtos;
    }

    getExpectedSetDto(): CreateSetDto {
        const expectedSetDto: CreateSetDto = new CreateSetDto();
        expectedSetDto.baseSize = this.MOCK_BASE_SET_SIZE;
        expectedSetDto.block = this.MOCK_SET_NAME;
        expectedSetDto.code = this.MOCK_SET_CODE;
        expectedSetDto.keyruneCode = this.MOCK_SET_CODE.toLowerCase();
        expectedSetDto.name = this.MOCK_SET_NAME;
        expectedSetDto.releaseDate = this.MOCK_RELEASE_DATE;
        expectedSetDto.type = this.MOCK_SET_TYPE;
        expectedSetDto.url = this.MOCK_DTO_URL;
        return expectedSetDto;
    }

    getExpectedSetDtos(): CreateSetDto[] {
        const expectedSetDtos: CreateSetDto[] = [];
        expectedSetDtos.push(this.getExpectedSetDto());
        return expectedSetDtos;
    }
}