import { Test, TestingModule } from "@nestjs/testing";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { MtgJsonIngestionMapper } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper";
import { CreateCardDto } from "src/core/card/api/card.dto";
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
        })
    });
});
