import { Test, TestingModule } from "@nestjs/testing";
import { CardDto, CreateCardDto, UpdateCardDto } from "src/core/card/api/card.dto";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Format, LegalityDto, LegalityStatus } from "src/core/card/api/legality.dto";
import { Card } from "src/core/card/card.entity";
import { CardMapper } from "src/core/card/card.mapper";
import { CardService } from "src/core/card/card.service";
import { TestUtils } from "../../test-utils";
import { MockCardRepository } from "./mock.card.repository";

describe("CardService", () => {
    let service: CardService;
    let repository: MockCardRepository;
    let mapper: CardMapper;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode = "SET";
    const allFormats = Object.values(Format);

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
        repository.reset();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("should save new cards and return saved cards", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards.length).toBe(createCardDtos.length);
        savedCards.forEach((card, i) => {
            expect(card.id).toBe(i + 1);
            expect(card.name).toBe(createCardDtos[i].name);
            expect(card.setCode).toBe(createCardDtos[i].setCode);
            expect(card.legalities.length).toBe(createCardDtos[i].legalities.length);
        });
    });

    it("should update existing cards and return saved cards", async () => {
        const updateCardDtos: UpdateCardDto[] = testUtils.getMockUpdateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(updateCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards.length).toBe(updateCardDtos.length);
        savedCards.forEach((card, i) => {
            expect(card.id).toBe(updateCardDtos[i].id);
            expect(card.name).toBe(updateCardDtos[i].name);
            expect(card.setCode).toBe(updateCardDtos[i].setCode);
            expect(card.legalities.length).toBe(updateCardDtos[i].legalities.length);
            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status);
                expect(Object.values(Format)).toContain(legality.format);
                expect(legality.cardId).toBe(card.id);
            });
        });
    });

    it("should handle empty card dto array", async () => {
        const savedCards: CardDto[] = await service.save([]);
        jest.spyOn(repository, 'save');

        expect(repository.save).not.toHaveBeenCalled();
        expect(savedCards).toEqual([]);
    });

    it("should handle repository save failure with empty array", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error("Repository save failed"));

        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual([]);
    });

    it("should update CreateCardDtos that already exist in repository", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const existingCards: Card[] = testUtils.getMockCards(mockSetCode).map((card, i) => ({
            ...card,
            id: i + 1,
        }));
        jest.spyOn(repository, 'save').mockResolvedValue(existingCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(existingCards));
        for (const card of savedCards) {
            expect(card.legalities.length).toBe(createCardDtos.find(dto =>
                dto.name === card.name)?.legalities.length
            );
            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status);
                expect(Object.values(Format)).toContain(legality.format);
                expect(legality.cardId).toBe(card.id);
            });
        }
    });

    it("should find all cards in set and fill missing formats with NotLegal status", async () => {
        // TODO: make it so that card legalities are missing some formats
        // and then the remainder need to be added with Not Legal
        repository.populate(testUtils.getMockCards(mockSetCode));
        jest.spyOn(repository, 'findAllInSet');
        const foundCards: CardDto[] = await service.findAllInSet(mockSetCode);
        expect(repository.findAllInSet).toHaveBeenCalledTimes(1);
        expect(foundCards.length).toBeGreaterThan(0);
        for (const card of foundCards) {
            expect(card.legalities.length).toBe(Object.values(Format).length);
            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status || "Not Legal");
                expect(Object.values(Format)).toContain(legality.format);
                expect(legality.cardId).toBe(card.id);
            });
        }

    });

    // should include Not Legal for find*
    it("should find card by id and fill missing formats with NotLegal status", async () => {
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const index = 0;
        jest.spyOn(repository, 'findById').mockResolvedValue(mockCards[index]);
        const foundCard: CardDto | null = await service.findById(index + 1);
        expect(repository.findById).toHaveBeenCalled();
        expect(foundCard).toEqual(testUtils.mapCardEntityToDto(mockCards[index], "normal"));
        expect(foundCard?.legalities.length).toBe(Object.values(Format).length);
    });

    it("should save CreateCardDto and update with existing IDs", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const existingCards: Card[] = mockCards.map((card, index) => ({
            ...card,
            id: index + 1,
        }));
        // TODO: fix this. Move away from using mockResolvedValue
        jest.spyOn(repository, 'save').mockResolvedValue(existingCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(existingCards));
    });

    it("save should not save legality with invalid status", async () => {
        const inputCreateCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(inputCreateCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        for (const card of savedCards) {
            expect(card.legalities.length).toBeLessThanOrEqual(inputCreateCardDtos.find(dto => dto.name === card.name)?.legalities.length || 0);
            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status);
            });
        }
    });

    it('temp', async () => {
        const legalities: LegalityDto[] = [
            {
                cardId: 1,
                format: Format.Standard,
                status: LegalityStatus.Banned,
            },
            {
                cardId: 1,
                format: Format.Modern,
                status: "Not Legal",
            },
            {
                cardId: 1,
                format: Format.Legacy,
                status: LegalityStatus.Legal
            },
            {
                cardId: 1,
                format: "fake",
                status: LegalityStatus.Legal,
            }
        ];
        const expectedInvalidLegalities: LegalityDto[] = [
            {
                cardId: 1,
                format: "fake",
                status: LegalityStatus.Legal,
            }
        ];
        const inputFormats: Set<string> = new Set([Format.Standard, Format.Modern, Format.Legacy]);
        const filterResult: LegalityDto[] = legalities.filter(l => !inputFormats.has(l.format));
        expect(filterResult).toEqual(expectedInvalidLegalities);
    });


    // FIXME: code expects invalid legalities to be included as null so that they can be deleted, 
    // but if they're null...how can that work?
    it('should save card and delete each invalid legality', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            status: 'invalidStatus' as LegalityStatus,
        };

        const validCreateCardDtos = createCardDtos.map(dto => ({
            ...dto,
            legalities: dto.legalities.filter(legality => Object.values(LegalityStatus).includes(legality.status as LegalityStatus)),
        }));

        jest.spyOn(repository, 'save');
        jest.spyOn(repository, 'deleteLegality');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).toHaveBeenCalledTimes(1);
        expect(savedCards.length).toBe(validCreateCardDtos.length);
        savedCards.forEach((card, i) => {
            expect(card.legalities.length).toBe(validCreateCardDtos[i].legalities.length);
            for (const legality of card.legalities) {
                expect(Object.values(LegalityStatus)).toContain(legality.status);
            }
        });
    });

    it('should save card and not save card legality if legality format is invalid', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            format: 'invalidFormat' as Format,
        };

        const expectedValidCardDtos = createCardDtos.map(dto => ({
            ...dto,
            legalities: dto.legalities.filter(legality => Object.values(Format).includes(legality.format as Format)),
        }));

        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards.length).toBe(expectedValidCardDtos.length);
        savedCards.forEach((card, i) => {
            expect(card.legalities.length).toBe(expectedValidCardDtos[i].legalities.length);
            for (const legality of card.legalities) {
                expect(Object.values(Format)).toContain(legality.format);
            }
        });
    });

    /*
    TODO: REVIEW BELOW TEST: THIS IS WHERE YOU LEFT OFF 1/24/2025
    */
    it('should save legality if valid format, status, cardId (card exists) and legality not already saved for a card in db', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards = createCardDtos.map((dto, i) => testUtils.mapCreateCardDtoToEntity(dto, i + 1));
        repository.save(mockCards);

        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(mockCards));
    });

    it('should delete legality in db if not in given card legalities', async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards: Card[] = createCardDtos.map((dto, i) => testUtils.mapCreateCardDtoToEntity(dto, i + 1));
        repository.save(mockCards);

        createCardDtos[0].legalities.pop();
        jest.spyOn(repository, 'save');
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

        expect(savedCards[0].legalities[0].status).toBe(LegalityStatus.Banned);
    });
});

