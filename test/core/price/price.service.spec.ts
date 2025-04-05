import { Test, TestingModule } from "@nestjs/testing";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceMapper } from "src/core/price/price.mapper";
import { PriceService } from "src/core/price/price.service";
import { TestUtils } from "../../test-utils";

jest.mock("src/core/price/price.mapper");

describe("PriceService", () => {
    let service: PriceService;
    let repository: jest.Mocked<PriceRepositoryPort>;
    let mapper: jest.Mocked<PriceMapper>;

    const testUtils = new TestUtils();
    const mockPrices: PriceDto[] = testUtils.getMockPriceDtos();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceService,
                {
                    provide: PriceRepositoryPort,
                    useValue: {
                        save: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        saveOne: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        findByCardId: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        findByCardName: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        findByCardNameAndSetCode: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        findByCardSet: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        findById: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        delete: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: PriceMapper,
                    useValue: {
                        toEntity: jest.fn().mockImplementation((dto) => testUtils.mapPriceDtoToEntity(dto)),
                        toDto: jest.fn().mockImplementation((entity) => testUtils.mapPriceEntityToDto(entity)),
                    },
                },
            ],
        }).compile();

        service = module.get<PriceService>(PriceService);
        repository = module.get(PriceRepositoryPort);
        mapper = module.get(PriceMapper);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("should save prices and return saved prices", async () => {
        const savedPrices = await service.save(mockPrices);
        expect(repository.save).toHaveBeenCalledWith(mockPrices.map(mapper.toEntity));
        expect(savedPrices).toEqual(mockPrices);
    });

    it("should save one price and return the saved price", async () => {
        const savedPrice = await service.saveOne(mockPrices[0]);
        expect(repository.saveOne).toHaveBeenCalledWith(mapper.toEntity(mockPrices[0]));
        expect(savedPrice).toEqual(mockPrices[0]);
    });

    it("should find a price by card ID", async () => {
        const foundPrice = await service.findByCardId(1);
        expect(repository.findByCardId).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should find prices by card name", async () => {
        const foundPrices = await service.findByCardName("Test Card");
        expect(repository.findByCardName).toHaveBeenCalledWith("Test Card");
        expect(foundPrices).toEqual(mockPrices);
    });

    it("should find a price by card name and set code", async () => {
        const foundPrice = await service.findByCardNameAndSetCode("Test Card", "SET1");
        expect(repository.findByCardNameAndSetCode).toHaveBeenCalledWith("Test Card", "SET1");
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should find prices by card set", async () => {
        const foundPrices = await service.findByCardSet("SET1");
        expect(repository.findByCardSet).toHaveBeenCalledWith("SET1");
        expect(foundPrices).toEqual(mockPrices);
    });

    it("should find a price by ID", async () => {
        const foundPrice = await service.findById(1);
        expect(repository.findById).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should delete a price by ID", async () => {
        await service.delete(1);
        expect(repository.delete).toHaveBeenCalledWith(1);
    });
});