import { normalize } from "path";
import { AllPricesTodayFile } from "src/adapters/mtgjson-ingestion/dto/allPricesTodayFile.dto";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { Identifiers } from "src/adapters/mtgjson-ingestion/dto/identifiers.dto";
import { PriceFormats } from "src/adapters/mtgjson-ingestion/dto/priceFormats.dto";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";

export class MtgJsonIngestionTestUtils {

    readonly MOCK_SET_CODE: string = "set";
    private readonly MOCK_BASE_SET_SIZE: number = 3;
    private readonly MOCK_SET_NAME: string = "Setname";
    private readonly MOCK_RELEASE_DATE: string = "1970-01-01";
    private readonly MOCK_SET_TYPE: string = "expansion";
    private readonly MOCK_ROOT_SCRYFALL_ID: string = "abc123def456";

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
            card.artist = "artist";
            card.identifiers = new Identifiers();
            card.isReserved = false;
            card.legalities = {
                // standard intentionally omitted for testing
                alchemy: "legal",
                brawl: "not legal",
                commander: "legal",
                duel: "legal",
                explorer: "legal",
                future: "legal",
                gladiator: "legal",
                historic: "legal",
                historicbrawl: "legal",
                legacy: "legal",
                modern: "banned",
                oathbreaker: "legal",
                oldschool: "legal",
                pauper: "",
                paupercommander: "legal",
                penny: "legal",
                pioneer: "legal",
                predh: "legal",
                premodern: "legal",
                vintage: "legal",
            },
                card.manaCost = `{${i}}{W}`;
            card.name = "Test Card Name" + i;
            card.number = i.toString();
            card.rarity = i % 2 === 1 ? "common" : "uncommon";
            card.identifiers.scryfallId = i + this.MOCK_ROOT_SCRYFALL_ID;
            card.originalText = "Test card text.";
            card.setCode = this.MOCK_SET_CODE;
            card.text = "Test card text.";
            card.uuid = `abcd-1234-efgh-5678-ijkl-901${i}`;
            card.type = "type";
            cards.push(card);
        }
        let bonusCard = new CardSet();
        bonusCard.artist = "artist";
        bonusCard.identifiers = new Identifiers();
        bonusCard.isReserved = false;
        bonusCard.legalities = {
            // standard purposely omitted for testing
            alchemy: "legal",
            brawl: "not legal",
            commander: "legal",
            duel: "legal",
            explorer: "legal",
            future: "legal",
            gladiator: "legal",
            historic: "legal",
            historicbrawl: "legal",
            legacy: "legal",
            modern: "banned",
            oathbreaker: "legal",
            oldschool: "legal",
            pauper: "",
            paupercommander: "legal",
            penny: "legal",
            pioneer: "legal",
            predh: "legal",
            premodern: "legal",
            vintage: "legal",
        },
            bonusCard.manaCost = "{U/G}{B/W}{R/U}";
        bonusCard.name = "Test Bonus Card Name";
        bonusCard.number = (this.MOCK_BASE_SET_SIZE + 1).toString();
        bonusCard.originalText = "Bonus card text.";
        bonusCard.rarity = "mythic"
        bonusCard.identifiers.scryfallId = bonusCard.number + this.MOCK_ROOT_SCRYFALL_ID;
        bonusCard.setCode = this.MOCK_SET_CODE;
        bonusCard.text = "Bonus card text.";
        bonusCard.type = "type";
        bonusCard.uuid = "zyxw-0987-vutsr-6543-qponm-21098";
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
                artist: "artist",
                imgSrc: `${i}/a/${i}${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
                isReserved: false,
                legalities: this.getExpectedLegalityDtos(),
                manaCost: `{${i}}{W}`,
                name: `Test Card Name${i}`,
                number: `${i}`,
                oracleText: "Test card text.",
                rarity: i % 2 === 1 ? "common" : "uncommon",
                setCode: this.MOCK_SET_CODE,
                uuid: `abcd-1234-efgh-5678-ijkl-901${i}`,
                type: "type",
            };
            cards.push(card);
        }
        const bonusCard: CreateCardDto = {
            artist: "artist",
            imgSrc: `4/a/4${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
            isReserved: false,
            legalities: this.getExpectedLegalityDtos(),
            manaCost: "{U/G}{B/W}{R/U}",
            name: "Test Bonus Card Name",
            number: `${this.MOCK_BASE_SET_SIZE + 1}`,
            oracleText: "Bonus card text.",
            rarity: "mythic",
            setCode: this.MOCK_SET_CODE,
            uuid: "zyxw-0987-vutsr-6543-qponm-21098",
            type: "type",
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
            parentCode: null,
            releaseDate: this.MOCK_RELEASE_DATE,
            code: this.MOCK_SET_CODE,
            type: this.MOCK_SET_TYPE,
        };
        return expectedSet;
    }

    // single item array for testing purposes
    getExpectedCreateSetDtos(): CreateSetDto[] {
        const expectedSets: CreateSetDto[] = [];
        expectedSets.push(this.getExpectedCreateSetDto());
        return expectedSets;
    }

    getExpectedLegalityDtos(): LegalityDto[] {
        return [
            {
                cardId: null,
                format: "commander",
                status: "legal",
            },
            {
                cardId: null,
                format: "explorer",
                status: "legal",
            },
            {
                cardId: null,
                format: "historic",
                status: "legal",
            },
            {
                cardId: null,
                format: "legacy",
                status: "legal",
            },
            {
                cardId: null,
                format: "modern",
                status: "banned",
            },
            {
                cardId: null,
                format: "oathbreaker",
                status: "legal",
            },
            {
                cardId: null,
                format: "pioneer",
                status: "legal",
            },
            {
                cardId: null,
                format: "vintage",
                status: "legal",
            },
        ];
    }

    getMockAllPricesTodayFile(dateKey: string, baseValue: number): AllPricesTodayFile {
        return {
            meta: {
                date: dateKey,
                version: "1.0.0",
            },
            data: {
                "abcd-1234-efgh-5678-ijkl-9011": this.getMockPriceFormats(dateKey, baseValue),
                "zyxw-0987-vutsr-6543-qponm-2109": this.getMockPriceFormats(dateKey, baseValue),
            }
        };
    }

    getPriceTodayRecord(uuid: string, dateKey: string, baseValue: number): Record<string, PriceFormats> {
        return {
            [uuid]: this.getMockPriceFormats(dateKey, baseValue),
        };
    }

    getMockPriceFormats(dateKey: string, baseValue: number): PriceFormats {
        return {
            mtgo: {
                cardhoarder: this.getMockPriceList(dateKey, (baseValue - 0.01)),
            },
            paper: {
                cardkingdom: this.getMockPriceList(dateKey, baseValue),
                cardmarket: this.getMockPriceList(dateKey, baseValue + 1),
                cardsphere: this.getMockPriceList(dateKey, baseValue + 2),
                tcgplayer: this.getMockPriceList(dateKey, baseValue + 3),
            },
        };
    }

    getMockPriceList(dateKey: string, baseValue: number): PriceList {
        return {
            buylist: this.getMockPricePoints(dateKey, baseValue),
            currency: "USD",
            retail: this.getMockPricePoints(dateKey, baseValue),
        };
    }

    getMockPricePoints(dateKey: string, baseValue: number): PricePoints {
        return {
            foil: {
                [dateKey]: baseValue * 2,
            },
            normal: {
                [dateKey]: baseValue, 
            },
        };
    }

    getExpectedCreatePriceDtos(): any {
        return [
            {
                cardUuid: "abcd-1234-efgh-5678-ijkl-9011",
                foil: 1.23,
                normal: 2.34,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "zyxw-0987-vutsr-6543-qponm-2109",
                foil: 3.45,
                normal: 4.56,
                date: new Date("2023-10-01"),
            },
        ];
    }
}