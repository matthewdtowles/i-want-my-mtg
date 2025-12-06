import { Test, TestingModule } from "@nestjs/testing";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { CardService } from "src/core/card/card.service";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";

describe("CardService", () => {
    let service: CardService;
    let repository: jest.Mocked<CardRepositoryPort>;

    const mockQueryOptions = new SafeQueryOptions({ page: 1, limit: 10 });

    const testCard = new Card({
        id: "test-card-id",
        name: "Test Card",
        setCode: "TST",
        number: "123",
        rarity: CardRarity.Common,
        imgSrc: "test-image.jpg",
        isReserved: false,
        hasFoil: true,
        hasNonFoil: true,
        sortNumber: "000123",
        type: "Creature",
        legalities: [
            new Legality({ format: Format.Standard, status: LegalityStatus.Legal, cardId: "test-card-id" }),
            new Legality({ format: Format.Modern, status: LegalityStatus.Legal, cardId: "test-card-id" }),
            new Legality({ format: Format.Pauper, status: LegalityStatus.Legal, cardId: "test-card-id" }),
            new Legality({ format: Format.Legacy, status: LegalityStatus.Legal, cardId: "test-card-id" })
        ]
    });

    beforeEach(async () => {
        const mockRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            deleteLegality: jest.fn(),
            findByIds: jest.fn(),
            findAllInSet: jest.fn(),
            findWithName: jest.fn(),
            findBySetCodeAndNumber: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardService,
                { provide: CardRepositoryPort, useValue: mockRepository }
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get(CardRepositoryPort) as jest.Mocked<CardRepositoryPort>;
    });

    describe("save", () => {
        it("should save new cards and return the number of saved cards", async () => {
            const cardsToSave = [testCard];
            repository.findById.mockResolvedValue(null); // Card doesn't exist yet
            repository.save.mockResolvedValue(1);

            const result = await service.save(cardsToSave);

            expect(repository.findById).toHaveBeenCalledWith(testCard.id, ["legalities"]);
            expect(repository.save).toHaveBeenCalledWith(cardsToSave);
            expect(result).toBe(1);
        });

        it("should update existing cards with new data", async () => {
            const existingCard = new Card({
                ...testCard,
                imgSrc: "old-image.jpg",
                legalities: [
                    new Legality({ format: Format.Pioneer, status: LegalityStatus.Banned, cardId: "test-card-id" }),
                    new Legality({ format: Format.Modern, status: LegalityStatus.Restricted, cardId: "test-card-id" }),
                    new Legality({ format: Format.Legacy, status: LegalityStatus.Legal, cardId: "test-card-id" })
                ]
            });

            const updatedCard = new Card({
                ...testCard,
                imgSrc: "new-image.jpg",
                legalities: [
                    new Legality({ format: Format.Standard, status: LegalityStatus.Banned, cardId: "test-card-id" })
                ]
            });

            repository.findById.mockResolvedValue(existingCard);
            repository.save.mockResolvedValue(1);

            const result = await service.save([updatedCard]);

            expect(repository.save).toHaveBeenCalledWith([expect.objectContaining({
                id: "test-card-id",
                imgSrc: "new-image.jpg"
            })]);
            expect(result).toBe(1);
        });

        it("should delete legalities that are not included in the update", async () => {
            const existingCard = new Card({
                ...testCard,
                legalities: [
                    new Legality({ format: Format.Standard, status: LegalityStatus.Legal, cardId: "test-card-id" }),
                    new Legality({ format: Format.Modern, status: LegalityStatus.Legal, cardId: "test-card-id" })
                ]
            });

            const updatedCard = new Card({
                ...testCard,
                legalities: [
                    new Legality({ format: Format.Standard, status: LegalityStatus.Banned, cardId: "test-card-id" })
                ]
            });

            repository.findById.mockResolvedValue(existingCard);
            repository.save.mockResolvedValue(1);
            repository.deleteLegality.mockResolvedValue();

            const result = await service.save([updatedCard]);

            expect(repository.deleteLegality).toHaveBeenCalledWith(
                "test-card-id",
                Format.Modern
            );
            expect(result).toBe(1);
        });

        it("should handle empty array input", async () => {
            const result = await service.save([]);

            expect(repository.save).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });

        it("should handle repository errors gracefully", async () => {
            repository.findById.mockRejectedValue(new Error("Database error"));
            const result = await service.save([testCard]);

            expect(result).toBe(0);
        });
    });

    describe("findAllWithName", () => {
        it("should return cards with the given name", async () => {
            const cards = [testCard];
            repository.findWithName.mockResolvedValue(cards);

            const result = await service.findWithName("Test Card", mockQueryOptions);

            expect(repository.findWithName).toHaveBeenCalledWith("Test Card", mockQueryOptions);
            expect(result).toEqual(cards);
        });

        it("should throw error when repository fails", async () => {
            repository.findWithName.mockRejectedValue(new Error("Database error"));

            await expect(service.findWithName("Test Card", mockQueryOptions))
                .rejects
                .toThrow("Error finding cards with name Test Card");
        });
    });

    describe("private helper methods", () => {
        it("should extract legalities to save correctly", async () => {
            const cardWithInvalidLegality = new Card({
                ...testCard,
                legalities: [
                    new Legality({ format: Format.Standard, status: LegalityStatus.Legal, cardId: "test-card-id" }),
                    new Legality({ format: "invalid-format" as Format, status: LegalityStatus.Legal, cardId: "test-card-id" })
                ]
            });

            repository.findById.mockResolvedValue(null);
            repository.save.mockResolvedValue(1);

            await service.save([cardWithInvalidLegality]);

            expect(repository.save).toHaveBeenCalledWith([
                expect.objectContaining({
                    legalities: [
                        expect.objectContaining({ format: Format.Standard })
                    ]
                })
            ]);
        });
    });
});
