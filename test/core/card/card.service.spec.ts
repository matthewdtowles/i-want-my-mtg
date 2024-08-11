import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../../../src/core/card/card.service';
import { CardRepositoryPort } from '../../../src/core/card/ports/card.repository.port';
import { CardDataIngestionPort } from '../../../src/core/card/ports/card-data.ingestion.port';
import { Card } from '../../../src/core/card/card';
import { TestUtils } from '../../test-utils';


describe('CardService', () => {
    const testUtils: TestUtils = new TestUtils();
    const mockSetCode: string = 'SET';
    const mockSetNumber = 1;

    const mockSetCards: Card[] = testUtils.getMockSetCards(mockSetCode);
    const mockCardsWithName: Card[] = testUtils.getMockCardsWithName(3);
    const mockSavedCard: Card = testUtils.getMockCard(mockSetNumber, mockSetCode);
    const inputCard: Card = testUtils.getMockInputCard(mockSetNumber, mockSetCode);

    let service: CardService;
    let repository: CardRepositoryPort;
    let ingestionSvc: CardDataIngestionPort;

    const mockCardRepository: CardRepositoryPort = {
        cardExists: jest.fn().mockResolvedValue(true),
        findAllInSet: jest.fn().mockResolvedValue(mockSetCards),
        findAllWithName: jest.fn().mockResolvedValue(mockCardsWithName),
        findById: jest.fn().mockResolvedValue(mockSavedCard),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockSavedCard),
        findByUuid: jest.fn().mockResolvedValue(mockSavedCard),
        removeById: jest.fn(),
        saveCard: jest.fn().mockResolvedValue(mockSavedCard),
    };

    const mockCardIngestion: CardDataIngestionPort = {
        fetchCard: jest.fn(),
        fetchSetCards: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardService,
                {
                    provide: CardRepositoryPort,
                    useValue: mockCardRepository,
                },
                {
                    provide: CardDataIngestionPort,
                    useValue: mockCardIngestion,
                },
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort);
        ingestionSvc = module.get<CardDataIngestionPort>(CardDataIngestionPort);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('saves card and returns saved card if cardExists returns false', async () => {
        const repoSaveCard = jest.spyOn(repository, 'saveCard');
        jest.spyOn(repository, 'cardExists').mockReturnValueOnce(Promise.resolve(false));
        const repoCardExists = jest.spyOn(repository, 'cardExists');
        const createdCard: Card = await service.create(inputCard);
        expect(repoCardExists).toHaveBeenCalledWith(inputCard);
        expect(repoSaveCard).toHaveBeenCalledWith(inputCard);
        expect(createdCard).toEqual(mockSavedCard);
    });

    it('returns given card and does not save if cardExists returns true', async () => {
        const repoSaveCard = jest.spyOn(repository, 'saveCard');
        const repoCardExists = jest.spyOn(repository, 'cardExists');
        const createdCard: Card = await service.create(inputCard);
        expect(repoCardExists).toHaveBeenCalledWith(inputCard);
        expect(repoSaveCard).not.toHaveBeenCalled();
        expect(createdCard).toEqual(mockSavedCard);
    });

    it('finds all cards in given set by setCode', async () => {
        const repoFindAllInSet = jest.spyOn(repository, 'findAllInSet');
        const foundCards: Card[] = await service.findAllInSet(mockSetCode);
        expect(repoFindAllInSet).toHaveBeenCalledWith(mockSetCode)
        expect(foundCards).toEqual(mockSetCards);
    });

    it('finds every instance of a card with given name', async () => {
        const repoFindAllWithName = jest.spyOn(repository, 'findAllWithName');
        const foundCards: Card[] = await service.findAllWithName(testUtils.MOCK_CARD_NAME);
        expect(repoFindAllWithName).toHaveBeenCalledWith(testUtils.MOCK_CARD_NAME);
        expect(foundCards).toEqual(mockCardsWithName);
    });

    it('finds a unique instance of a card by id', async () => {
        const repoFindById = jest.spyOn(repository, 'findById');
        const foundCard: Card = await service.findById(mockSetNumber);
        expect(repoFindById).toHaveBeenCalledWith(mockSetNumber);
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('returns unique instance of a card by setCode and card number in that set', async () => {
        const repoFindBySetCodeAndNumber = jest.spyOn(repository, 'findBySetCodeAndNumber');
        const foundCard: Card = await service.findBySetCodeAndNumber(mockSetCode, mockSetNumber);
        expect(repoFindBySetCodeAndNumber).toHaveBeenCalledWith(mockSetCode, mockSetNumber);
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('returns unique instance of a card by uuid', async () => {
        const repoFindByUuid = jest.spyOn(repository, 'findByUuid');
        const foundCard: Card = await service.findByUuid(inputCard.uuid);
        expect(repoFindByUuid).toHaveBeenCalledWith(inputCard.uuid);
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('updates and returns updated version of given card', async () => {
        const repoSaveCard = jest.spyOn(repository, 'saveCard');
        const updatedCard: Card = await service.update(mockSavedCard);
        expect(repoSaveCard).toHaveBeenCalledWith(mockSavedCard);
        expect(updatedCard).toEqual(mockSavedCard);
    });
});
