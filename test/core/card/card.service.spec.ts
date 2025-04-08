import { Test, TestingModule } from "@nestjs/testing";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { CardMapper } from "src/core/card/card.mapper";
import { CardService } from "src/core/card/card.service";
import { Legality } from "src/core/card/legality.entity";
import { TestUtils } from "../../test-utils";
import { MockCardRepository } from "./mock.card.repository";
import { CardDto } from "src/core/card/api/card.dto";
import { CreateCardDto, UpdateCardDto } from "src/core/card/api/create-card.dto";
import { Format } from "src/core/card/api/format.enum";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";

describe("CardService", () => {
    let service: CardService;
    let repository: MockCardRepository;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode = "SET";

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

        expect(await service.save(createCardDtos)).toEqual([]);
        expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it("should update cards that already exist in repository", async () => {
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
        const preexistingCards: Card[] = testUtils.getMockCards(mockSetCode);
        preexistingCards.forEach(card => {
            card.legalities = card.legalities.filter(legality => legality.format !== Format.Standard);
            card.legalities.forEach(legality => {
                if (legality.cardId === 1 && legality.format === Format.Modern) {
                    legality.status = LegalityStatus.Banned;
                }
            });
        });
        // each card should have all but 1 legality format, but then need to fill in the missing format with Not Legal
        // additinoally, card 1 will be banned in modern
        preexistingCards.forEach(card => {
            const standardLegality = card.legalities
                .find(legality => legality.format === Format.Standard);
            expect(standardLegality).toBeUndefined();
            if (card.id === 1) {
                const modernLegality: Legality = card.legalities
                    .find(legality => legality.format === Format.Modern);
                expect(modernLegality).toBeDefined();
                expect(modernLegality?.status).toBe(LegalityStatus.Banned);
            } else {
                card.legalities.forEach(legality => {
                    if (legality.format !== Format.Standard) {
                        // everything not standard should be legal if not cardId 1
                        expect(legality.status).toBe(LegalityStatus.Legal);
                    }
                });
            }
        });
        repository.populate(preexistingCards);
        jest.spyOn(repository, 'findAllInSet');
        const foundCards: CardDto[] = await service.findAllInSet(mockSetCode);

        expect(repository.findAllInSet).toHaveBeenCalledTimes(1);
        expect(foundCards.length).toBeGreaterThan(0);
        for (const card of foundCards) {
            // subtract 1 for standard missing
            expect(card.legalities.length).toBe(Object.values(Format).length - 1);

            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status || "Not Legal");
                expect(Object.values(Format)).toContain(legality.format);
                expect(legality.cardId).toBe(card.id);
            });
        }
    });

    it("should throw error with message if card lookup error occurs in findAllInSet", async () => {
        jest.spyOn(repository, 'findAllInSet').mockRejectedValueOnce(new Error("Repository error"));
        await expect(service.findAllInSet(mockSetCode)).rejects.toThrow(`Error finding cards in set ${mockSetCode}`);
        expect(repository.findAllInSet).toHaveBeenCalledTimes(1);
    });

    it("should find card by id and fill missing formats with NotLegal status", async () => {
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const index = 0;
        jest.spyOn(repository, 'findById').mockResolvedValue(mockCards[index]);
        const foundCard: CardDto | null = await service.findById(index + 1);
        expect(repository.findById).toHaveBeenCalled();
        expect(foundCard).toEqual(testUtils.mapCardEntityToDto(mockCards[index], "normal"));
        expect(foundCard?.legalities.length).toBe(Object.values(Format).length);
    });

    it("should throw error with message if card lookup error occurs with findById", async () => {
        jest.spyOn(repository, 'findById');//.mockRejectedValueOnce(new Error("Repository error"));
        await expect(service.findById(666)).rejects.toThrow(`Error finding card with id 666`);
        expect(repository.findById).toHaveBeenCalledTimes(1);
    });

    it("should find card by set code and number and fill missing formats with NotLegal status", async () => {
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const index = 0;
        const setCode = mockCards[index].setCode;
        const number = mockCards[index].number;
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockResolvedValue(mockCards[index]);
        const foundCard: CardDto | null = await service.findBySetCodeAndNumber(setCode, number);
        expect(repository.findBySetCodeAndNumber).toHaveBeenCalledWith(setCode, number);
        expect(foundCard).toEqual(testUtils.mapCardEntityToDto(mockCards[index], "normal"));
        expect(foundCard?.legalities.length).toBe(Object.values(Format).length);
    });

    it("should throw error with message if card lookup error occurs with findBySetCodeAndNumber", async () => {
        const setCode = "INVALID_SET";
        const number = "999";
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockRejectedValueOnce(new Error("Repository error"));
        await expect(service.findBySetCodeAndNumber(setCode, number)).rejects.toThrow(`Error finding card with setCode ${setCode} and number ${number}: Repository error`);
        expect(repository.findBySetCodeAndNumber).toHaveBeenCalledWith(setCode, number);
    });

    it("should find card by uuid and fill missing formats with NotLegal status", async () => {
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const index = 0;
        const uuid = mockCards[index].uuid;
        jest.spyOn(repository, 'findByUuid').mockResolvedValue(mockCards[index]);
        const foundCard: CardDto | null = await service.findByUuid(uuid);
        expect(repository.findByUuid).toHaveBeenCalledWith(uuid);
        expect(foundCard).toEqual(testUtils.mapCardEntityToDto(mockCards[index], "normal"));
        expect(foundCard?.legalities.length).toBe(Object.values(Format).length);
    });

    it("should throw error with message if card lookup error occurs with findByUuid", async () => {
        const uuid = "INVALID_UUID";
        jest.spyOn(repository, 'findByUuid').mockRejectedValueOnce(new Error("Repository error"));
        await expect(service.findByUuid(uuid)).rejects.toThrow(`Error finding card with uuid ${uuid}: Repository error`);
        expect(repository.findByUuid).toHaveBeenCalledWith(uuid);
    });

    it("should save CreateCardDto and update with existing IDs", async () => {
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
        const existingCards: Card[] = mockCards.map((card, index) => ({
            ...card,
            id: index + 1,
        }));
        jest.spyOn(repository, 'save').mockResolvedValue(existingCards);
        const savedCards: CardDto[] = await service.save(createCardDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapCardEntitiesToDtos(existingCards));
    });

    it("save should not save legality with invalid status", async () => {
        const inputCreateCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        inputCreateCardDtos[0].legalities[0] = {
            ...inputCreateCardDtos[0].legalities[0],
            status: 'invalidStatus' as LegalityStatus,
        };
        jest.spyOn(repository, 'save');
        const savedCards: CardDto[] = await service.save(inputCreateCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards.length).toBeGreaterThan(0);

        for (let i = 0; i < savedCards.length; i++) {
            const card: CardDto = savedCards[i];
            const inputCard: CreateCardDto = inputCreateCardDtos[i];
            expect(card.legalities.length).toBeGreaterThan(0);
            expect(card.legalities.length).toBeLessThanOrEqual(inputCard.legalities.length);
            card.legalities.forEach(legality => {
                expect(Object.values(LegalityStatus)).toContain(legality.status);
            });
        }

        expect(savedCards[0].legalities.length).toBe(inputCreateCardDtos[0].legalities.length - 1);
        expect(savedCards[0].legalities.length).toBe(savedCards[1].legalities.length - 1);
    });


    it('should save card, delete out-dated legality, save valid input legalities', async () => {
        // establish existing cards in DB
        const existingCards: Card[] = testUtils.getMockCards(mockSetCode);
        repository.populate(existingCards);
        const createCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);
        // invalid legality status - should remove if in DB
        createCardDtos[0].legalities[0] = {
            ...createCardDtos[0].legalities[0],
            status: 'invalidStatus' as LegalityStatus,
        };
        // invalid legality format - should remove if in DB
        createCardDtos[0].legalities[1] = {
            ...createCardDtos[0].legalities[1],
            format: 'invalidFormat' as Format,
        };
        // the absence of the format means the missing format should be removed from DB
        createCardDtos[0].legalities[2] = null;

        jest.spyOn(repository, 'save');
        jest.spyOn(repository, 'deleteLegality');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        // the 3 invalid legalities should be removed since they were previously in DB
        expect(repository.deleteLegality).toHaveBeenCalledTimes(3);
        expect(savedCards.length).toBeGreaterThan(0);
        expect(savedCards.length).toBe(createCardDtos.length);
        expect(savedCards[0].legalities.length).toBe(createCardDtos[0].legalities.length - 3);
        for (const legality of savedCards[0].legalities) {
            expect(Object.values(LegalityStatus)).toContain(legality.status);
            expect(Object.values(Format)).toContain(legality.format);
            expect(legality.cardId).toBe(savedCards[0].id);
        }
    });

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
        jest.spyOn(repository, 'deleteLegality');
        const savedCards: CardDto[] = await service.save(createCardDtos);

        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.deleteLegality).toHaveBeenCalledTimes(1);
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
        expect(savedCards[0].legalities[1].status).toBe(LegalityStatus.Legal);
        expect(savedCards[1].legalities[0].status).toBe(LegalityStatus.Legal);
    });
});

