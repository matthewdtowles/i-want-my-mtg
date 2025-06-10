import { Test, TestingModule } from "@nestjs/testing";
import { Card, CardRepositoryPort } from "src/core/card";
import { PriceRepositoryPort, PriceService } from "src/core/price";


describe("PriceService", () => {
    let subject: PriceService;
    let mockPriceRepo: jest.Mocked<PriceRepositoryPort>;
    let mockCardRepo: jest.Mocked<CardRepositoryPort>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceService,
                {
                    provide: PriceRepositoryPort,
                    useValue: {
                        save: jest.fn(),
                        saveMany: jest.fn(),
                        findByCardId: jest.fn(),
                        findByCardName: jest.fn(),
                        findByCardNameAndSetCode: jest.fn(),
                        findByCardSet: jest.fn(),
                        findById: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: CardRepositoryPort,
                    useValue: {
                        findByUuid: jest.fn(),
                        findByUuids: jest.fn(),
                    },
                },
            ],
        }).compile();

        subject = module.get<PriceService>(PriceService);
        mockCardRepo = module.get(CardRepositoryPort);
        mockPriceRepo = module.get(PriceRepositoryPort);
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
            card.id = dto.cardUuid;
            card.order = i + 1;
            mockCards.push(card);
        });
        mockCardRepo.findByUuids.mockResolvedValue(mockCards);
        const _cards: Card[] = [
            { order: 1 } as Card,
            { order: 2 } as Card,
        ];

        await subject.save(dtos);
        expect(mockPriceRepo.save).toHaveBeenCalledWith([
            { card: _cards[0], date: dtos[0].date, normal: 1.1, foil: null },
            { card: _cards[1], date: dtos[1].date, normal: null, foil: 2.2 },
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

    it("should delete a price by ID", async () => {
        await subject.delete(1);
        expect(mockPriceRepo.delete).toHaveBeenCalledWith(1);
    });
});