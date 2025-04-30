import { Test, TestingModule } from "@nestjs/testing";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { MtgJsonIngestionMapper } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { LegalityDto } from "src/core/card/api/legality.dto";
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
        cards = testUtils.mockCardSetArray();
        set = testUtils.mockSetDto();
        setList = testUtils.mockSetListArray();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("DataMapperService map provider models to DTOs", () => {
        it("maps the Set model from DataProvider to CreateSetDto", () => {
            const expectedSet: CreateSetDto = testUtils.expectedCreateSetDto();
            const actualSet: CreateSetDto = service.toCreateSetDto(set);
            expect(actualSet).toEqual(expectedSet);
        });

        it("map Set.CardSet model from DataProvider to CreateCardDto[]", () => {
            const expectedCards: CreateCardDto[] = testUtils.expectedCreateCardDtos();
            const actualCards: CreateCardDto[] = service.toCreateCardDtos(cards);
            expect(actualCards).toEqual(expectedCards);
        });

        it("map SetList model from DataProvider to CreateSetDto[]", () => {
            const expectedSet: CreateSetDto[] = testUtils.expectedCreateSetDtos();
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
    });
});
