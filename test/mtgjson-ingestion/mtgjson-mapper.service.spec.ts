import { Test, TestingModule } from "@nestjs/testing";
import { CardSet } from "src/adapters/mtgjson-ingestion/dto/cardSet.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { SetList } from "src/adapters/mtgjson-ingestion/dto/setList.dto";
import { MtgJsonIngestionMapper } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper";
import { CreateCardDto } from "src/core/card/api/card.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { MtgJsonIngestionTestUtils } from "./mtgjson-ingestion-test-utils";
import { Format, LegalityDto } from "src/core/card/api/legality.dto";

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
                {
                    format: "commander", status: "legal",
                    cardId: null
                },
                {
                    format: "explorer", status: "legal",
                    cardId: null
                },
                {
                    format: "historic", status: "legal",
                    cardId: null
                },
                {
                    format: "legacy", status: "legal",
                    cardId: null
                },
                {
                    format: "modern", status: "banned",
                    cardId: null
                },
                {
                    format: "oathbreaker", status: "legal",
                    cardId: null
                },
                {
                    format: "pioneer", status: "legal",
                    cardId: null
                },
                {
                    format: "vintage", status: "legal",
                    cardId: null
                },
            ];
            expect(legalities).toEqual(expectedLegalities);
        });

        it("isValidFormat returns true for valid legal formats", () => {
            const validFormats: string[] = Object.values(Format);
            expect(validFormats.length).toBeGreaterThan(0);
            for (const format of validFormats) {
                expect(service.isValidFormat(format)).toBe(true);
            }
        });

        it("isValidFormat returns false for invalid legal formats", () => {
            expect(service.isValidFormat("alchemy")).toBe(false);
            expect(service.isValidFormat("")).toBe(false);
            expect(service.isValidFormat(null)).toBe(false);
        });

        it("isValidStatus returns true for valid legal statuses", () => {
            const validStatuses: string[] = ["legal", "restricted", "banned"];
            for (const status of validStatuses) {
                expect(service.isValidStatus(status)).toBe(true);
            }
        });

        it("isValidStatus returns false for invalid legal statuses", () => {
            const invalidStatuses: string[] = ["", "invalid", "not legal", null];
            for (const status of invalidStatuses) {
                expect(service.isValidStatus(status)).toBe(false);
            }
        });
    });
});
