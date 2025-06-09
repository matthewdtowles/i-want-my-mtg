import { AllPricesTodayFile } from "src/adapters/mtgjson-ingestion/dto/allPricesTodayFile.dto";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { Identifiers } from "src/adapters/mtgjson-ingestion/dto/identifiers.dto";
import { PriceFormats } from "src/adapters/mtgjson-ingestion/dto/priceFormats.dto";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { Readable } from "stream";

export class MtgJsonIngestionTestUtils {

    readonly MOCK_SET_CODE: string = "set";
    private readonly MOCK_BASE_SET_SIZE: number = 3;
    private readonly MOCK_SET_NAME: string = "Setname";
    private readonly MOCK_RELEASE_DATE: string = "1970-01-01";
    private readonly MOCK_SET_TYPE: string = "expansion";
    private readonly MOCK_ROOT_SCRYFALL_ID: string = "abc123def456";

    mockSetDto(): SetDto {
        let set: SetDto = new SetDto();
        set.baseSetSize = this.MOCK_BASE_SET_SIZE;
        set.block = this.MOCK_SET_NAME;
        set.cards = this.mockCardSetArray();
        set.code = this.MOCK_SET_CODE;
        set.isFoilOnly = false;
        set.isNonFoilOnly = false;
        set.keyruneCode = this.MOCK_SET_CODE;
        set.name = this.MOCK_SET_NAME;
        set.releaseDate = this.MOCK_RELEASE_DATE;
        set.type = this.MOCK_SET_TYPE;
        return set;
    }

    mockCardSetArray(): CardSet[] {
        let cards: CardSet[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            let card = new CardSet();
            card.artist = "artist";
            card.hasFoil = false;
            card.hasNonFoil = true;
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
            };
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
        bonusCard.hasFoil = false;
        bonusCard.hasNonFoil = true;
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
        };
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

    mockSetListArray(): SetList[] {
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

    expectedCreateCardDtos(): CreateCardDto[] {
        const cards: CreateCardDto[] = [];
        for (let i = 1; i <= this.MOCK_BASE_SET_SIZE; i++) {
            const card: CreateCardDto = {
                artist: "artist",
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: `${i}/a/${i}${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
                isReserved: false,
                legalities: this.expectedLegalityDtos(),
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
            hasFoil: false,
            hasNonFoil: true,
            imgSrc: `4/a/4${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
            isReserved: false,
            legalities: this.expectedLegalityDtos(),
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

    expectedCreateSetDto(): CreateSetDto {
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
    expectedCreateSetDtos(): CreateSetDto[] {
        const expectedSets: CreateSetDto[] = [];
        expectedSets.push(this.expectedCreateSetDto());
        return expectedSets;
    }

    expectedLegalityDtos(): CreateLegalityDto[] {
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

    mockPriceStream(): Readable {
        const uuids: string[] = [
            "abcd-1234-efgh-5678-ijkl-9011",
            "zyxw-0987-vutsr-6543-qponm-2109",
        ];
        const dateKey: string = "2023-10-01";
        const baseValue: number = 1.00;
        return Readable.from(Object.entries(this.mockAllPricesTodayFile(uuids, dateKey, baseValue)));
    }

    mockAllPricesTodayFile(
        uuids: string[],
        dateKey: string,
        baseValue: number,
    ): AllPricesTodayFile {
        const _data: Record<string, PriceFormats> = {};
        for (const uuid of uuids) {
            _data[uuid] = this.mockPriceFormats(dateKey, baseValue);
        }
        return {
            meta: {
                date: dateKey,
                version: "1.0.0",
            },
            data: _data,
        };
    }

    priceTodayRecord(uuid: string, dateKey: string, baseValue: number): Record<string, PriceFormats> {
        return {
            [uuid]: this.mockPriceFormats(dateKey, baseValue),
        };
    }

    mockPriceFormats(dateKey: string, baseValue: number): PriceFormats {
        return {
            mtgo: {
                cardhoarder: this.mockPriceList(dateKey, (baseValue - 0.01)),
            },
            paper: {
                cardkingdom: this.mockPriceList(dateKey, baseValue),
                cardmarket: this.mockPriceList(dateKey, baseValue, "EUR"),
                cardsphere: this.mockPriceList(dateKey, baseValue),
                tcgplayer: this.mockPriceList(dateKey, baseValue),
            },
        };
    }

    mockPriceList(dateKey: string, baseValue: number, currency?: string): PriceList {
        return {
            buylist: this.mockPricePoints(dateKey, baseValue),
            currency: currency || "USD",
            retail: this.mockPricePoints(dateKey, baseValue),
        };
    }

    mockPricePoints(dateKey: string, baseValue: number): PricePoints {
        return {
            foil: {
                [dateKey]: baseValue * 2,
            },
            normal: {
                [dateKey]: baseValue,
            },
        };
    }

    expectedCreatePriceDtos(): CreatePriceDto[] {
        return [
            {
                cardUuid: "abcd-1234-efgh-5678-ijkl-9011",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "abcd-1234-efgh-5678-ijkl-9011",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "abcd-1234-efgh-5678-ijkl-9011",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "zyxw-0987-vutsr-6543-qponm-2109",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "zyxw-0987-vutsr-6543-qponm-2109",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
            {
                cardUuid: "zyxw-0987-vutsr-6543-qponm-2109",
                foil: 2.00,
                normal: 1.00,
                date: new Date("2023-10-01"),
            },
        ];
    }
}