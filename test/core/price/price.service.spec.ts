import { Test, TestingModule } from "@nestjs/testing";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceMapper } from "src/core/price/price.mapper";
import { PriceService } from "src/core/price/price.service";
import { TestUtils } from "../../test-utils";
import { Card } from "src/core/card/card.entity";


describe("PriceService", () => {
    let subject: PriceService;
    let mockPriceRepo: jest.Mocked<PriceRepositoryPort>;
    let mockCardRepo: jest.Mocked<CardRepositoryPort>;
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
                        findByUuids: jest.fn().mockResolvedValue(testUtils.getMockCardEntities()),
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
        mockCardRepo = module.get(CardRepositoryPort);
        mockPriceRepo = module.get(PriceRepositoryPort);
        mockPriceMapper = module.get(PriceMapper);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should save averaged prices with normal and/or foil", async () => {
        const _date: Date = new Date("2024-05-05");
        const dtos: CreatePriceDto[] = [
            { cardUuid: 'uuid-1', date: _date, normal: 1.1 },
            { cardUuid: 'uuid-2', date: _date, foil: 2.2 },
        ];
        const mockCards: Card[] = [];
        dtos.forEach((dto, i) => {
            const card: Card = new Card();
            card.uuid = dto.cardUuid;
            card.id = i + 1;
            mockCards.push(card);
        });
        mockCardRepo.findByUuids.mockResolvedValue(mockCards);
        mockPriceMapper.toEntity.mockImplementation((dto, cardId) => {
            return {
                id: cardId,
                card: { id: cardId } as Card,
                date: dto.date,
                normal: dto.normal ?? null,
                foil: dto.foil ?? null,
            };
        });
        await subject.save(dtos);

        const _cards: Card[] = [
            { id: 1 } as Card,
            { id: 2 } as Card,
        ];

        expect(mockPriceRepo.save).toHaveBeenCalledWith([
            { id: 1, card: _cards[0], date: dtos[0].date, normal: 1.1, foil: null },
            { id: 2, card: _cards[1], date: dtos[1].date, normal: null, foil: 2.2 },
        ]);
    });

    it("should skip unknown card UUIDs", async () => {
        const dtos: CreatePriceDto[] = [
            { cardUuid: 'uuid-x', date: new Date("2024-01-01"), normal: 1.1 },
        ];
        mockCardRepo.findByUuids.mockResolvedValue([]);

        await subject.save(dtos);

        expect(mockPriceRepo.save).toHaveBeenCalledWith([]);
    });

    it("should find a price by card ID", async () => {
        const foundPrice = await subject.findByCardId(1);

        expect(mockPriceRepo.findByCardId).toHaveBeenCalledWith(1);
        expect(foundPrice).toEqual(mockPrices[0]);
    });

    it("should delete a price by ID", async () => {
        await subject.delete(1);

        expect(mockPriceRepo.delete).toHaveBeenCalledWith(1);
    });
});