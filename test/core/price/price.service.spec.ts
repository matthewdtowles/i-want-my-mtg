import { Test, TestingModule } from "@nestjs/testing";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceMapper } from "src/core/price/price.mapper";
import { PriceService } from "src/core/price/price.service";
import { TestUtils } from "../../test-utils";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";


describe("PriceService", () => {
    let subject: PriceService;
    let mockPriceRepository: jest.Mocked<PriceRepositoryPort>;
    let mockPriceMapper: jest.Mocked<PriceMapper>;
    let testUtils: TestUtils = new TestUtils();
    const mockPrices: PriceDto[] = testUtils.getMockPriceDtos();
    const mockCreatePrices: CreatePriceDto[] = testUtils.getMockCreatePriceDtos();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceService,
                {
                    provide: PriceRepositoryPort,
                    useValue: {
                        save: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        saveMany: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        findByCardId: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        findByCardName: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        findByCardNameAndSetCode: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        findByCardSet: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()),
                        findById: jest.fn().mockResolvedValue(testUtils.getMockPriceEntities()[0]),
                        delete: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: CardRepositoryPort,
                    useValue: {
                        findByUuid: jest.fn().mockResolvedValue(testUtils.getMockCardEntity()),
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

    it("should save a price and return saved price", async () => {
        const savedPrice = await subject.save(mockCreatePrices[0]);
        expect(savedPrice).toEqual(mockPrices[0]);
    });

    it("should save prices and return saved prices", async () => {
        const savedPrices = await subject.saveMany(mockCreatePrices);
        expect(savedPrices).toEqual(mockPrices);
    });

    it("should find a price by card ID", async () => {
        const foundPrice = await subject.findByCardId(1);
        expect(mockPriceRepository.findByCardId).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should delete a price by ID", async () => {
        await subject.delete(1);
        expect(mockPriceRepository.delete).toHaveBeenCalledWith(1);
    });
});