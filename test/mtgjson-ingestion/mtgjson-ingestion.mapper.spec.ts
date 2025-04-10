import { Test, TestingModule } from "@nestjs/testing";
import { AllPricesTodayFile } from "src/adapters/mtgjson-ingestion/dto/allPricesTodayFile.dto";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { MtgJsonIngestionMapper } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { MtgJsonIngestionTestUtils } from "./mtgjson-ingestion-test-utils";

describe("MtgJsonIngestionMapper", () => {
    let service: MtgJsonIngestionMapper;
    let cards: CardSet[] = [];
    let set: SetDto;
    let setList: SetList[];
    let testUtils: MtgJsonIngestionTestUtils;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MtgJsonIngestionMapper],
        }).compile();
        service = module.get<MtgJsonIngestionMapper>(MtgJsonIngestionMapper);
        testUtils = new MtgJsonIngestionTestUtils();
        cards = testUtils.getMockCardSetArray();
        set = testUtils.getMockSetDto();
        setList = testUtils.getMockSetListArray();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("DataMapperService map provider models to DTOs", () => {
        it("maps the Set model from DataProvider to CreateSetDto", () => {
            const expectedSet: CreateSetDto = testUtils.getExpectedCreateSetDto();
            const actualSet: CreateSetDto = service.toCreateSetDto(set);
            expect(actualSet).toEqual(expectedSet);
        });

        it("map Set.CardSet model from DataProvider to CreateCardDto[]", () => {
            const expectedCards: CreateCardDto[] = testUtils.getExpectedCreateCardDtos();
            const actualCards: CreateCardDto[] = service.toCreateCardDtos(cards);
            expect(actualCards).toEqual(expectedCards);
        });

        it("map SetList model from DataProvider to CreateSetDto[]", () => {
            const expectedSet: CreateSetDto[] = testUtils.getExpectedCreateSetDtos();
            const actualSet: CreateSetDto[] = service.toCreateSetDtos(setList);
            expect(actualSet).toEqual(expectedSet);
        });

        it("toLegalityDtos maps mtgjson legalities to LegalityDto[]", () => {
            // expect any legality that is validFormat and isValidStatus to be mapped as is
            // otherwise expect it to NOT be mapped at all
            const legalities: LegalityDto[] = service.toLegalityDtos(cards[0].legalities);
            const expectedLegalities: LegalityDto[] = [
                { format: "commander", status: "legal", cardId: null },
                { format: "explorer", status: "legal", cardId: null },
                { format: "historic", status: "legal", cardId: null },
                { format: "legacy", status: "legal", cardId: null },
                { format: "modern", status: "banned", cardId: null },
                { format: "oathbreaker", status: "legal", cardId: null },
                { format: "pioneer", status: "legal", cardId: null },
                { format: "vintage", status: "legal", cardId: null },
            ];
            expect(legalities).toEqual(expectedLegalities);
        });


        // TODO: implement/fix these tests (TDD)
        it("toPriceDtos maps mtgjson AllPricesTodayFile to CreatePriceDto[]", () => {
            const dateKey: string = "2023-10-01";
            const baseValue: number = 1.0;

            const uuids: string[] = [
                "abcd-1234-efgh-5678-ijkl-9011",
                "zyxw-0987-vutsr-6543-qponm-2109",
            ];
            const prices = testUtils.getMockAllPricesTodayFile(uuids, dateKey, baseValue);
            const expectedPrices = testUtils.getExpectedCreatePriceDtos();
            console.log("input prices", prices);
            const actualPrices = service.toCreatePriceDtos(prices);
            console.log("actualPrices", actualPrices);
            console.log("expectedPrices", expectedPrices);
            expect(actualPrices).toEqual(expectedPrices);
        });

        it("toPriceDtos maps mtgjson AllPricesTodayFile to CreatePriceDto[] with empty data", () => {
            const prices = new AllPricesTodayFile();
            prices.meta = {
                date: "2023-10-01",
                version: "1.0"
            };
            prices.data = {};
            const expectedPrices: CreatePriceDto[] = [];
            const actualPrices = service.toCreatePriceDtos(prices);
            expect(actualPrices).toEqual(expectedPrices);
        });
    });
});
