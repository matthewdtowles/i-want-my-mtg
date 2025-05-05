import { Test, TestingModule } from "@nestjs/testing";
import { MtgJsonApiClient } from "src/adapters/mtgjson-ingestion/mtgjson-api.client";
import { MtgJsonIngestionMapper } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { MtgJsonIngestionTestUtils } from "./mtgjson-ingestion-test-utils";
import { PriceFormats } from "src/adapters/mtgjson-ingestion/dto/priceFormats.dto";

// TODO: simplify this test by using mock from the last test



function* syncIterable<T>(items: T[]): Generator<T> {
    for (const item of items) yield item;
}

async function* asyncIterable<T>(items: T[]): AsyncGenerator<T> {
    yield* syncIterable(items);
}
describe("MtgJsonIngestionService", () => {
    let service: MtgJsonIngestionService;
    let testUtils: MtgJsonIngestionTestUtils;
    let apiClient: MtgJsonApiClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MtgJsonApiClient,
                MtgJsonIngestionService,
                MtgJsonIngestionMapper,
            ],
        }).compile();

        apiClient = module.get<MtgJsonApiClient>(MtgJsonApiClient);
        service = module.get<MtgJsonIngestionService>(MtgJsonIngestionService);
        testUtils = new MtgJsonIngestionTestUtils();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("getAllSets should return array of every set as CreateSetDto", async () => {
        jest.spyOn(apiClient, "fetchSetList").mockResolvedValue(testUtils.mockSetListArray());
        expect(await service.fetchAllSetsMeta()).toEqual(testUtils.expectedCreateSetDtos());
    });

    it("should call external api to find a set by code and map to a CreateSetDto", async () => {
        jest.spyOn(apiClient, "fetchSet").mockResolvedValue(testUtils.mockSetDto());
        expect(await service.fetchSetByCode(testUtils.MOCK_SET_CODE)).toEqual(testUtils.expectedCreateSetDto());
    });

    it("fetchSetCards should return array of every card as CreateCardDto in given set", async () => {
        jest.spyOn(apiClient, "fetchSet").mockResolvedValue(testUtils.mockSetDto());
        expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.expectedCreateCardDtos());
    });

    it("should stream CreatePriceDto objects for valid paper retail data", async () => {
        const cardUuid = "abc-123";
        const mockStream = asyncIterable([
            { key: cardUuid, value: testUtils.mockPriceFormats("2024-01-01", 1) },
        ]);
        jest.spyOn(apiClient, "fetchTodayPricesStream").mockResolvedValue(mockStream as any);

        const results: CreatePriceDto[] = [];
        for await (const dto of service.fetchTodayPrices()) {
            results.push(dto);
        }
        expect(results).toHaveLength(3);
        expect(results[0]).toEqual({
            cardUuid,
            date: new Date("2024-01-01"),
            foil: 2,
            normal: 1,
        });
        expect(results[1]).toEqual({
            cardUuid,
            date: new Date("2024-01-01"),
            foil: 2,
            normal: 1,
        });
    });

    it("should skip non-USD currencies", async () => {
        const mockNonUsd = {
            paper: {
                cardkingdom: {
                    currency: "EUR",
                    retail: { "2024-01-01": 9.99 },
                },
            },
        };
        jest.spyOn(apiClient, "fetchTodayPricesStream").mockResolvedValue(
            asyncIterable([{ key: "id1", value: mockNonUsd }]) as any
        );
        const results = [];
        for await (const dto of service.fetchTodayPrices()) {
            results.push(dto);
        }
        expect(results).toHaveLength(0);
    });

    it("should skip entries with no retail prices", async () => {
        const mockNoRetail = {
            paper: {
                cardmarket: {
                    currency: "USD",
                    buylist: { "2024-01-01": 3.00 },
                },
            },
        };
        jest.spyOn(apiClient, "fetchTodayPricesStream").mockResolvedValue(
            asyncIterable([{ key: "id2", value: mockNoRetail }]) as any
        );
        const results = [];
        for await (const dto of service.fetchTodayPrices()) {
            results.push(dto);
        }
        expect(results).toHaveLength(0);
    });

    it("should average prices for same card on the same date from all providers", async () => {
        const cardUuid: string = "abc-123";
        const dateStr: string = "2024-01-01";
        const mockPriceFormats: PriceFormats = {
            mtgo: {
                cardhoarder: {
                    currency: "USD",
                    retail: {
                        normal: { [dateStr]: 1 },
                        foil: { [dateStr]: 2 },
                    },
                },
            },
            paper: {
                cardkingdom: {
                    currency: "USD",
                    retail: {
                        normal: { [dateStr]: 3.90 },
                        foil: { [dateStr]: 5 },
                    },
                },
                cardmarket: {
                    currency: "EUR",
                    retail: {
                        normal: { [dateStr]: 12 },
                        foil: { [dateStr]: 20 },
                    },
                },
                cardsphere: {
                    currency: "USD",
                    retail: {
                        normal: { [dateStr]: 4.50 },
                        foil: { [dateStr]: 8 },
                    },
                },
                tcgplayer: {
                    currency: "USD",
                    retail: {
                        normal: { [dateStr]: 4 },
                        foil: { [dateStr]: 8 },
                    },
                },
            },
        };

        const mockStream = asyncIterable([
            { key: cardUuid, value: mockPriceFormats },
        ]);
        jest.spyOn(apiClient, "fetchTodayPricesStream").mockResolvedValue(mockStream as any);

        const results: CreatePriceDto[] = []
        for await (const dto of service.fetchTodayPrices()) {
            results.push(dto);
        }
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            cardUuid,
            date: new Date(dateStr),
            foil: 7,
            normal: 4.14,
        });
    });
});