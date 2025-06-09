import { Test, TestingModule } from "@nestjs/testing";
import {
    Card,
    CardMapper,
    CardRarity,
    CardRepositoryPort,
    CardService,
    CreateCardDto,
    Format,
    LegalityStatus
} from "src/core/card";
import { MockCardRepository } from "test/core/card/mock.card.repository";


describe("CardService", () => {
    let service: CardService;
    let repository: MockCardRepository;

    const mockSetCode = "SET";
    const mockInputCards: Card[] = Array.from({ length: 3 }, (_, i) => ({
        artist: "artist",
        hasFoil: false,
        hasNonFoil: true,
        imgSrc: `${i + 1}/a/${i + 1}abc123def456.jpg`,
        isReserved: false,
        legalities: Object.values(Format).map((format) => ({
            cardId: i + 1,
            format,
            status: LegalityStatus.Legal
        })),
        manaCost: `{${i + 1}}{W}`,
        name: `Test Card Name ${i + 1}`,
        number: `${i + 1}`,
        oracleText: "Test card text.",
        rarity: i % 2 === 0 ? "common" : "uncommon",
        setCode: mockSetCode,
        uuid: `abcd-1234-efgh-5678-ijkl-${mockSetCode}${i + 1}`,
        type: "type",
    }));


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: CardRepositoryPort, useClass: MockCardRepository },
                CardService,
                CardMapper,
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort) as MockCardRepository;
    });

    afterEach(() => {
        repository.reset();
    })

    it("should save new cards and return saved cards", async () => {
        const createCardDtos: Card[] = mockInputCards;
        jest.spyOn(repository, "save");

        const result: Card[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(result).toMatchSnapshot();
    });

    it("should update existing cards and return saved cards", async () => {
        const existingCard: Card = new Card();
        existingCard.order = 1;
        existingCard.name = "Card 1";
        existingCard.setCode = mockSetCode;
        existingCard.legalities = [
            { format: Format.Standard, status: LegalityStatus.Legal, cardId: 1 }
        ];
        existingCard.imgSrc = "imgSrc";
        existingCard.isReserved = false;
        existingCard.number = "1";
        existingCard.rarity = CardRarity.Common;
        existingCard.type = "type";
        existingCard.id = "uuid-123";
        repository.populate([existingCard]);

        const updateCardDtos: CreateCardDto[] = [
            {
                name: "Card 1",
                setCode: mockSetCode,
                legalities: [
                    { format: Format.Standard, status: LegalityStatus.Banned, cardId: 1 }
                ],
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrcUpdated",
                isReserved: true,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
                uuid: "uuid-123"
            }
        ];

        jest.spyOn(repository, "save");

        const result: CardDto[] = await service.save(updateCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Card 1");
        expect(result[0].isReserved).toBe(true);
        expect(result[0].rarity).toBe(CardRarity.Common);
        expect(result[0].legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Banned,
            cardId: 1,
        });
    });

    it("should handle empty card dto array", async () => {
        const savedCards: CardDto[] = await service.save([]);
        jest.spyOn(repository, "save");

        expect(repository.save).not.toHaveBeenCalled();
        expect(savedCards).toEqual([]);
    });

    it("should handle repository save failure with empty array", async () => {
        const createCardDtos: CreateCardDto[] = mockInputCards;
        jest.spyOn(repository, "save").mockRejectedValueOnce(new Error("Repository save failed"));

        expect(await service.save(createCardDtos)).toEqual([]);
        expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if card lookup fails", async () => {
        jest.spyOn(repository, "findById").mockRejectedValueOnce(new Error("Repository error"));

        await expect(service.findById(1)).rejects.toThrow("Error finding card with id 1");
        expect(repository.findByUuid).toHaveBeenCalledTimes(1);
    });

    it("should save legalities and delete previously saved legalities not given", async () => {
        const createCardDtos: CreateCardDto[] = [
            {
                name: "Card 1",
                setCode: mockSetCode,
                legalities: [
                    {
                        format: Format.Legacy, status: LegalityStatus.Legal,
                        cardId: 1
                    },
                ],
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrc",
                isReserved: false,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
                uuid: "uuid-123"
            },
        ];
        const existingEntity: Card = new Card();
        existingEntity.order = 1;
        existingEntity.name = "Card 1";
        existingEntity.setCode = mockSetCode;
        existingEntity.legalities = [
            {
                format: Format.Standard,
                status: LegalityStatus.Legal,
                cardId: 1
            },
            {
                format: Format.Legacy,
                status: LegalityStatus.Legal,
                cardId: 1
            },
        ];
        existingEntity.imgSrc = "imgSrc";
        existingEntity.isReserved = false;
        existingEntity.number = "1";
        existingEntity.rarity = CardRarity.Common;
        existingEntity.type = "type";
        existingEntity.id = "uuid-123";
        const existingCards: Card[] = [existingEntity];
        repository.populate(existingCards);
        jest.spyOn(repository, "save");
        jest.spyOn(repository, "deleteLegality");
        const cardBeforeSave: Card = await repository.findByUuid(1);
        expect(cardBeforeSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: 1,
        });

        const result: CardDto[] = await service.save(createCardDtos);

        const cardAfterSave: Card = await repository.findByUuid(1);
        expect(cardAfterSave?.legalities).not.toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: 1,
        });
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).toHaveBeenCalledTimes(1);
    });

    it("should update legality in db if legality in card but has different status", async () => {
        const createCardDtos: CreateCardDto[] = [
            {
                name: "Card 1",
                setCode: mockSetCode,
                legalities: [
                    {
                        format: Format.Standard,
                        status: LegalityStatus.Banned,
                        cardId: 1
                    },
                ],
                hasFoil: false,
                hasNonFoil: true,
                imgSrc: "imgSrc",
                isReserved: false,
                number: "1",
                rarity: CardRarity.Common,
                type: "type",
                uuid: "uuid-123"
            },
        ];
        const existingEntity: Card = new Card();
        existingEntity.order = 1;
        existingEntity.name = "Card 1";
        existingEntity.setCode = mockSetCode;
        existingEntity.legalities = [
            {
                format: Format.Standard,
                status: LegalityStatus.Legal,
                cardId: 1
            },
        ];
        existingEntity.imgSrc = "imgSrc";
        existingEntity.isReserved = false;
        existingEntity.number = "1";
        existingEntity.rarity = CardRarity.Common;
        existingEntity.type = "type";
        existingEntity.id = "uuid-123";
        const existingCards: Card[] = [existingEntity];
        repository.populate(existingCards);
        jest.spyOn(repository, "save");
        jest.spyOn(repository, "deleteLegality");

        const cardBeforeSave: Card = await repository.findByUuid(1);
        expect(cardBeforeSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Legal,
            cardId: 1,
        });

        const result: CardDto[] = await service.save(createCardDtos);

        const cardAfterSave: Card = await repository.findByUuid(1);
        expect(cardAfterSave?.legalities).toContainEqual({
            format: Format.Standard,
            status: LegalityStatus.Banned,
            cardId: 1,
        });
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).not.toHaveBeenCalled();
    });

});

