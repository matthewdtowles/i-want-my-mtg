import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../../../src/core/card/card.service';
import { CardRepositoryPort } from '../../../src/core/card/ports/card.repository.port';
import { CardDataIngestionPort } from '../../../src/core/card/ports/card-data.ingestion.port';
import { Card } from '../../../src/core/card/card';
import { TestUtils } from '../../test-utils';


describe('CardService', () => {
    const testUtils: TestUtils = new TestUtils();
    const mockSetNumber = 1;

    const mockSetCards: Card[] = testUtils.getMockSetCards(testUtils.MOCK_SET_CODE);
    const mockCardsWithName: Card[] = testUtils.getMockCardsWithName(3);
    const mockSavedCard: Card = testUtils.getMockCard(mockSetNumber, testUtils.MOCK_SET_CODE);
    const inputCard: Card = testUtils.getMockInputCard(mockSetNumber, testUtils.MOCK_SET_CODE);

    let service: CardService;
    let repository: CardRepositoryPort;
    let ingestionSvc: CardDataIngestionPort;

    const mockCardRepository: CardRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockSetCards),
        findAllInSet: jest.fn().mockResolvedValue(mockSetCards),
        findAllWithName: jest.fn().mockResolvedValue(mockCardsWithName),
        findById: jest.fn().mockResolvedValue(mockSavedCard),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockSavedCard),
        findByUuid: jest.fn().mockResolvedValue(mockSavedCard),
        delete: jest.fn(),
    };

    const mockCardIngestion: CardDataIngestionPort = {
        fetchSetCards: jest.fn().mockResolvedValue(mockSetCards),
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

    it('saves cards and returns saved cards', async () => {
        const repoSaveCard = jest.spyOn(repository, 'save');
        const createdCards: Card[] = await service.save(mockSetCards);
        expect(repoSaveCard).toHaveBeenCalledWith(mockSetCards);
        expect(createdCards).toEqual(mockSetCards);
    });

    it('finds all cards in given set by setCode', async () => {
        const repoFindAllInSet = jest.spyOn(repository, 'findAllInSet');
        const ingestFetchSetCards = jest.spyOn(ingestionSvc, 'fetchSetCards');
        const foundCards: Card[] = await service.findAllInSet(testUtils.MOCK_SET_CODE);
        expect(repoFindAllInSet).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE)
        expect(ingestFetchSetCards).not.toHaveBeenCalled();
        expect(foundCards).toEqual(mockSetCards);
    });

    it('finds all cards in given set by setCode after ingesting set cards', async () => {
        const repoFindAllInSet = jest.spyOn(repository, 'findAllInSet');
        const ingestFetchSetCards = jest.spyOn(ingestionSvc, 'fetchSetCards');
        const repoSaveCards = jest.spyOn(repository, 'save');
        jest.spyOn(repository, 'findAllInSet').mockReturnValueOnce(Promise.resolve([]));
        const foundCards: Card[] = await service.findAllInSet(testUtils.MOCK_SET_CODE);
        expect(repoFindAllInSet).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE);
        expect(ingestFetchSetCards).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE);
        expect(repoSaveCards).toHaveBeenCalledWith(mockSetCards);
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
        const foundCard: Card | null = await service.findById(mockSetNumber);
        expect(repoFindById).toHaveBeenCalledWith(mockSetNumber);
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('returns unique instance of a card by setCode and card number in that set', async () => {
        const repoFindBySetCodeAndNumber = jest.spyOn(repository, 'findBySetCodeAndNumber');
        const ingestFetchSetCards = jest.spyOn(ingestionSvc, 'fetchSetCards');
        const foundCard: Card = await service.findBySetCodeAndNumber(testUtils.MOCK_SET_CODE, mockSetNumber);
        expect(repoFindBySetCodeAndNumber).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE, mockSetNumber);
        expect(ingestFetchSetCards).not.toHaveBeenCalled();
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('returns unique instance of a card by setCode and card number in that set after ingesting set card', async () => {
        const repoFindBySetCodeAndNumber = jest.spyOn(repository, 'findBySetCodeAndNumber');
        const ingestFetchSetCards = jest.spyOn(ingestionSvc, 'fetchSetCards');
        const repoSaveCards = jest.spyOn(repository, 'save');
        jest.spyOn(repository, 'findBySetCodeAndNumber').mockReturnValueOnce(Promise.resolve(null));
        const foundCard: Card = await service.findBySetCodeAndNumber(testUtils.MOCK_SET_CODE, mockSetNumber);
        expect(repoFindBySetCodeAndNumber).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE, mockSetNumber);
        expect(ingestFetchSetCards).toHaveBeenCalledWith(testUtils.MOCK_SET_CODE);
        expect(repoSaveCards).toHaveBeenCalledWith(mockSetCards);
        expect(foundCard).toEqual(mockSavedCard);
    });

    it('returns unique instance of a card by uuid', async () => {
        const repoFindByUuid = jest.spyOn(repository, 'findByUuid');
        const foundCard: Card | null = await service.findByUuid(inputCard.uuid);
        expect(repoFindByUuid).toHaveBeenCalledWith(inputCard.uuid);
        expect(foundCard).toEqual(mockSavedCard);
    });
});
