import { Test, TestingModule } from "@nestjs/testing";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Price } from "src/core/price/price.entity";
import { PriceRepositoryPort } from "src/core/price/price.repository.port";
import { PriceService } from "src/core/price/price.service";

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
                        findById: jest.fn(),
                        verifyCardsExist: jest.fn(),
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
        const dtos: Price[] = [
            new Price({ cardId: "uuid-1", date: _date, normal: 1.1, }),
            new Price({ cardId: "uuid-2", date: _date, foil: 2.2 }),
        ];
        const existingCardIds: Set<string> = new Set(dtos.map(dto => dto.cardId));
        mockCardRepo.verifyCardsExist.mockResolvedValue(existingCardIds);

        await subject.save(dtos);

        expect(mockCardRepo.verifyCardsExist).toHaveBeenCalledWith(["uuid-1", "uuid-2"]);
        expect(mockPriceRepo.save).toHaveBeenCalledWith([
            { cardId: "uuid-1", date: dtos[0].date, normal: 1.1, foil: null },
            { cardId: "uuid-2", date: dtos[1].date, normal: null, foil: 2.2 },
        ]);
    });

    it("should skip unknown card UUIDs", async () => {
        const dtos: Price[] = [
            new Price({ cardId: "uuid-x", date: new Date("2024-01-01"), normal: 1.1 }),
        ];
        mockCardRepo.verifyCardsExist.mockResolvedValue(new Set());

        await subject.save(dtos);
        expect(mockPriceRepo.save).toHaveBeenCalledWith([]);
    });

    it("should delete a price by ID", async () => {
        await subject.delete(1);
        expect(mockPriceRepo.delete).toHaveBeenCalledWith(1);
    });
});