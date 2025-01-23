import { Test, TestingModule } from "@nestjs/testing";
import { CardDto, CreateCardDto, UpdateCardDto } from "src/core/card/api/card.dto";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { CardMapper } from "src/core/card/card.mapper";
import { CardService } from "src/core/card/card.service";
import { MockCardRepository } from "./mock.card.repository";
import { TestUtils } from "../../test-utils";
import { Format, LegalityStatus } from "src/core/card/api/legality.dto";

describe("CardService", () => {
    let service: CardService;
    let repository: MockCardRepository;
    let mapper: CardMapper;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode = "SET";
    const mockCards: Card[] = testUtils.getMockCards(mockSetCode);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardService,
                { provide: CardRepositoryPort, useClass: MockCardRepository },
                CardMapper,
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort) as MockCardRepository;
        mapper = module.get<CardMapper>(CardMapper);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should save new cards and return saved cards", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save').mockResolvedValue(mockCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(mockCards));
    });

    it("should update existing cards and return saved cards", async () => {
        const updateCardDtos: UpdateCardDto[] = testUtils.getMockUpdateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save').mockResolvedValue(mockCards);
        const savedCards: CardDto[] = await service.save(updateCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(mockCards));
    });

    it("should handle empty array of card DTOs", async () => {
        const savedCards: CardDto[] = await service.save([]);
        expect(repository.save).not.toHaveBeenCalled();
        expect(savedCards).toEqual([]);
    });

    it("should handle repository save failure", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error("Repository save failed"));
        await expect(service.save(createCardDtos)).rejects.toThrow("Repository save failed");
        expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("should update CreateCardDtos that already exist in repository", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const existingCards: Card[] = mockCards.map((card, index) => ({
            ...card,
            id: index + 1,
        }));
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockImplementation((setCode: string, number: number) => {
            return Promise.resolve(
                existingCards.find(c => c.setCode === setCode && c.number === number.toString()) || null
            );
        });
        jest.spyOn(repository, 'save').mockResolvedValue(existingCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(existingCards));
    });

    it("should find all cards in set and fill missing formats with NotLegal status", async () => {
        jest.spyOn(repository, 'findAllInSet').mockResolvedValue(mockCards);
        jest.spyOn(repository, 'findById').mockResolvedValue(mockCards[0]);
        const foundCards: CardDto[] = await service.findAllInSet(mockSetCode);
        expect(repository.findAllInSet).toHaveBeenCalledTimes(1);
        expect(foundCards).toEqual(testUtils.mapCardEntitiesToDtos(mockCards));
    });

    it("should find card by id and fill missing formats with NotLegal status", async () => {
        jest.spyOn(repository, 'findById').mockResolvedValue(mockCards[0]);
        const foundCard: CardDto | null = await service.findById(1);
        expect(repository.findById).toHaveBeenCalled();
        expect(foundCard).toEqual(testUtils.mapCardEntityToDto(mockCards[0], "normal"));
    });

    it("should save CreateCardDto and update with existing IDs", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const existingCards: Card[] = mockCards.map((card, index) => ({
            ...card,
            id: index + 1,
        }));
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockImplementation((setCode, number) => {
            return Promise.resolve(
                existingCards.find(
                    card => card.setCode === setCode && Number(card.number) === number
                ) || null
            );
        });
        jest.spyOn(repository, 'save').mockResolvedValue(existingCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(existingCards));
    });

    /*
    TODO: REVIEW BELOW TEST:
    */
    it("save should not save legality with invalid status", async () => {
        const inputCreateCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const expectedCards: Card[] = mockCards.map((card, i) => ({
            ...card,
            id: i + 1,
            legalities: card.legalities.map(legality => ({
                ...legality,
                cardId: i + 1,
            })),
        }));
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockImplementation((setCode, number) => {
            return Promise.resolve(
                expectedCards.find(
                    card => card.setCode === setCode && Number(card.number) === number
                ) || null
            );
        });
        jest.spyOn(repository, 'save').mockImplementation(cards => Promise.resolve(cards));
        const savedCards: CardDto[] = await service.save(inputCreateCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(expectedCards));
    });

    it('should not save a card legality if legality status is invalid', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            status: 'invalidStatus' as LegalityStatus,
        };
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(0);
        expect(savedCards).toEqual([]);
    });

    it('should not save card legality if legality format is invalid', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            format: 'invalidFormat' as Format,
        };
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(0);
    });

    it('should not save legality without a cardId', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            cardId: null,
        };
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(0);
        expect(savedCards).toEqual([]);
    });

    it('should not save legality with a cardId if a card does not exist with that cardId', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0].cardId = 999; // Non-existent cardId

        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(0);
        expect(savedCards).toEqual([]);
    });

    it('should save legality if valid format, status, cardId (card exists) and legality not already saved for a card in db', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards = createCardDtos.map((dto, i) => testUtils.mapCreateCardDtoToEntity(dto, i + 1));
        repository.save(mockCards);

        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(mockCards));
    });

    it('should delete legality in db if not in given card legalities', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards: Card[] = createCardDtos.map((dto, i) => testUtils.mapCreateCardDtoToEntity(dto, i + 1));
        repository.save(mockCards);

        // Remove a legality from the input DTOs
        createCardDtos[0].legalities.pop();
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards[0].legalities.length).toBe(createCardDtos[0].legalities.length);
    });

    it('should update legality in db if legality in card but has different status than the instance already saved in db', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards = createCardDtos.map((dto, i) => testUtils.mapCreateCardDtoToEntity(dto, i + 1));
        repository.save(mockCards);

        // Change the status of a legality in the input DTOs
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            status: LegalityStatus.Banned,
        };
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards[0].legalities[0].status).toBe(LegalityStatus.Banned);
    });
});

