import { Test, TestingModule } from "@nestjs/testing";
import {
    Card,
    CardRarity,
    CardRepositoryPort,
    CardService,
    Format,
    Legality,
    LegalityStatus
} from "src/core/card";


describe("CardService", () => {
    let service: CardService;
    let repository: CardRepositoryPort;

    const mockSetCode = "SET";
    const mockInputCards: Card[] = Array.from({ length: 3 }, (_, i) => (
        new Card({
            id: `abcd-1234-efgh-5678-ijkl-${mockSetCode}${i + 1}`,
            order: i + 1,
            prices: [],
            artist: "artist",
            hasFoil: false,
            hasNonFoil: true,
            imgSrc: `${i + 1}/a/${i + 1}abc123def456.jpg`,
            isReserved: false,
            legalities: Object.values(Format).map((format) => (
                new Legality({
                    cardId: String(i + 1),
                    format,
                    status: LegalityStatus.Legal
                }))),
            manaCost: `{${i + 1}}{W}`,
            name: `Test Card Name ${i + 1}`,
            number: `${i + 1}`,
            oracleText: "Test card text.",
            rarity: i % 2 === 0 ? CardRarity.Common : CardRarity.Uncommon,
            setCode: mockSetCode,
            type: "type",
        })));

    const mockCardRepository: CardRepositoryPort = {
        save: jest.fn().mockImplementation((cards: Card[]) => {
            return Promise.resolve(cards.map(card => {
                return { ...card, id: `uuid-${Math.random().toString(36).substring(2, 15)}` };
            }));
        }),
        findById: jest.fn().mockImplementation((id: string) => {
            const card = mockInputCards.find(card => card.id === id);
            return Promise.resolve(card ? { ...card, id } : null);
        }),
        deleteLegality: jest.fn(),
        findByIds: function (ids: string[]): Promise<Card[]> {
            throw new Error("Function not implemented.");
        },
        findAllInSet: function (code: string): Promise<Card[]> {
            return Promise.resolve(mockInputCards.filter(card => card.setCode === code));
        },
        findAllWithName: function (name: string): Promise<Card[]> {
            return Promise.resolve(mockInputCards.filter(card => card.name === name));
        },
        findBySetCodeAndNumber: function (code: string, number: string, relations: string[]): Promise<Card> {
            return Promise.resolve(
                mockInputCards.find(card => card.setCode === code && card.number === number) || null
            );
        },
        delete: jest.fn(),
    }


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: CardRepositoryPort, useValue: mockCardRepository },
                CardService,
            ],
        }).compile();
        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort);
    });

    it("should save new cards and return saved cards", async () => {
        const createCards: Card[] = mockInputCards;
        jest.spyOn(repository, "save");

        const result: Card[] = await service.save(createCards);

        expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("should update existing cards and return saved cards", async () => {
        const updateCards: Card[] = [
            new Card({
                name: "Card 1",
                setCode: mockSetCode,
                legalities: [
                    new Legality({ format: Format.Standard, status: LegalityStatus.Banned, cardId: "1" })
                ],
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrcUpdated",
                isReserved: true,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
                id: "uuid-123",
            })
        ];

        jest.spyOn(repository, "save");

        const result: Card[] = await service.save(updateCards);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Card 1");
        expect(result[0].isReserved).toBe(true);
        expect(result[0].rarity).toBe(CardRarity.Common);
        expect(result[0].legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Banned,
            cardId: "1",
        });
    });

    it("should handle empty card dto array", async () => {
        const savedCards: Card[] = await service.save([]);
        jest.spyOn(repository, "save");

        expect(repository.save).not.toHaveBeenCalled();
        expect(savedCards).toEqual([]);
    });

    it("should handle repository save failure with empty array", async () => {
        const createCards: Card[] = mockInputCards;
        jest.spyOn(repository, "save").mockRejectedValueOnce(new Error("Repository save failed"));

        expect(await service.save(createCards)).toEqual([]);
        expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if card lookup fails", async () => {
        jest.spyOn(repository, "findById").mockRejectedValueOnce(new Error("Repository error"));

        await expect(service.findById("1")).rejects.toThrow("Error finding card with id 1");
        expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it("should save legalities and delete previously saved legalities not given", async () => {
        const createCards: Card[] = [
            new Card({
                name: "Card 1",
                setCode: mockSetCode,
                legalities: [
                    {
                        format: Format.Legacy, status: LegalityStatus.Legal,
                        cardId: "1"
                    },
                ],
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrc",
                isReserved: false,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
            }),
        ];
        const existingEntity: Card = new Card({
            id: "uuid-123",
            order: 1,
            name: "Card 1",
            setCode: mockSetCode,
            imgSrc: "imgSrc",
            isReserved: false,
            number: "1",
            rarity: CardRarity.Common,
            type: "type",
            legalities: [
                new Legality({
                    format: Format.Standard,
                    status: LegalityStatus.Legal,
                    cardId: "1"
                }),
                new Legality({
                    format: Format.Legacy,
                    status: LegalityStatus.Legal,
                    cardId: "1"
                }),
            ],
        });
        const existingCards: Card[] = [existingEntity];
        jest.spyOn(repository, "save");
        jest.spyOn(repository, "deleteLegality");
        const cardBeforeSave: Card = await repository.findById("1", ["legalities"]);
        expect(cardBeforeSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: "1",
        });

        const result: Card[] = await service.save(createCards);

        const cardAfterSave: Card = await repository.findById("1", ["legalities"]);
        expect(cardAfterSave?.legalities).not.toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: "1",
        });
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).toHaveBeenCalledTimes(1);
    });

    it("should update legality in db if legality in card but has different status", async () => {
        const createCards: Card[] = [
            new Card({
                name: "Card 1",
                setCode: mockSetCode,
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrc",
                isReserved: false,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
                legalities: [
                    new Legality({
                        format: Format.Standard,
                        status: LegalityStatus.Banned,
                        cardId: "1"
                    }),
                ],
            }),
        ];
        const existingEntity: Card = new Card({
            id: "uuid-123",
            order: 1,
            name: "Card 1",
            setCode: mockSetCode,
            legalities: [
                {
                    format: Format.Standard,
                    status: LegalityStatus.Legal,
                    cardId: "1"
                },
            ],
            imgSrc: "imgSrc",
            isReserved: false,
            number: "1",
            rarity: CardRarity.Common,
            type: "type",
        });
        const existingCards: Card[] = [existingEntity];
        jest.spyOn(repository, "save");
        jest.spyOn(repository, "deleteLegality");

        const cardBeforeSave: Card = await repository.findById("1", ["legalities"]);
        expect(cardBeforeSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: "1",
        });

        const result: Card[] = await service.save(createCards);

        const cardAfterSave: Card = await repository.findById("1", ["legalities"]);
        expect(cardAfterSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Banned,
            cardId: "1",
        });
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).not.toHaveBeenCalled();
    });
});
