import { Test, TestingModule } from "@nestjs/testing";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceMapper } from "src/core/price/price.mapper";
import { PriceService } from "src/core/price/price.service";
import { TestUtils } from "../../test-utils";


describe("PriceService", () => {
    let subject: PriceService;
    let mockPriceRepository: jest.Mocked<PriceRepositoryPort>;
    let mockPriceMapper: jest.Mocked<PriceMapper>;
    let testUtils: TestUtils = new TestUtils();
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

        subject = module.get<PriceService>(PriceService);
        mockPriceRepository = module.get(PriceRepositoryPort);
        mockPriceMapper = module.get(PriceMapper);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(subject).toBeDefined();
    });

    it("should save prices and return saved prices", async () => {
        const savedPrices = await subject.save(mockPrices);
        expect(mockPriceRepository.save).toHaveBeenCalledWith(mockPrices.map(mockPriceMapper.toEntity));
        expect(savedPrices).toEqual(mockPrices);
    });

    it("should save one price and return the saved price", async () => {
        const savedPrice = await subject.saveOne(mockPrices[0]);
        expect(mockPriceRepository.saveOne).toHaveBeenCalledWith(mockPriceMapper.toEntity(mockPrices[0]));
        expect(savedPrice).toEqual(mockPrices[0]);
    });

    it("should find a price by card ID", async () => {
        const foundPrice = await subject.findByCardId(1);
        expect(mockPriceRepository.findByCardId).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should find prices by card name", async () => {
        const foundPrices = await subject.findByCardName("Test Card");
        expect(mockPriceRepository.findByCardName).toHaveBeenCalledWith("Test Card");
        expect(foundPrices).toEqual(mockPrices);
    });

    it("should find a price by card name and set code", async () => {
        const foundPrice = await subject.findByCardNameAndSetCode("Test Card", "SET1");
        expect(mockPriceRepository.findByCardNameAndSetCode).toHaveBeenCalledWith("Test Card", "SET1");
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should find prices by card set", async () => {
        const foundPrices = await subject.findByCardSet("SET1");
        expect(mockPriceRepository.findByCardSet).toHaveBeenCalledWith("SET1");
        expect(foundPrices).toEqual(mockPrices);
    });

    it("should find a price by ID", async () => {
        const foundPrice = await subject.findById(1);
        expect(mockPriceRepository.findById).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should delete a price by ID", async () => {
        await subject.delete(1);
        expect(mockPriceRepository.delete).toHaveBeenCalledWith(1);
    });
});