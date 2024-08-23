import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../../../src/core/card/card.service';
import { CardRepositoryPort } from '../../../src/core/card/ports/card.repository.port';
import { IngestionServicePort } from '../../../src/core/ingestion/ingestion.service.port';
import { TestUtils } from '../../test-utils';
import { CardDto } from '../../../src/core/card/dto/card.dto';
import { Card } from '../../../src/core/card/card.entity';

describe('CardService', () => {
    let service: CardService;
    let repository: CardRepositoryPort;
    let ingestionSvc: IngestionServicePort;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode: string = testUtils.MOCK_SET_CODE;
    const mockCards: Card[] = testUtils.getMockCards(mockSetCode);
    const mockCardDtos: CardDto[] = testUtils.getMockCardDtos(mockSetCode);

    const mockCardRepository: CardRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockCards),
        findAllInSet: jest.fn().mockResolvedValue(mockCards),
        findAllWithName: jest.fn().mockResolvedValue(mockCards),
        findById: jest.fn().mockResolvedValue(mockCards[0]),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockCards[0]),
        findByUuid: jest.fn().mockResolvedValue(mockCards[0]),
        delete: jest.fn(),
    };

    const mockCardIngestion: IngestionServicePort = {
        fetchSetCards: jest.fn().mockResolvedValue(mockCardDtos),
        fetchAllSetsMeta: jest.fn(),
        fetchSetByCode: jest.fn(),
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
                    provide: IngestionServicePort,
                    useValue: mockCardIngestion,
                },
            ],
        }).compile();

        service = module.get<CardService>(CardService);
        repository = module.get<CardRepositoryPort>(CardRepositoryPort);
        ingestionSvc = module.get<IngestionServicePort>(IngestionServicePort);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should save cards and return saved cards', async () => {
        const savedCards: CardDto[] = await service.save(testUtils.getMockCreateCardDtos(mockSetCode));
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedCards).toEqual(testUtils.mapEntitiesToDtos(mockCards));
    });

    it('should find all cards in a set by setCode', async () => {
        const foundCards: CardDto[] = await service.findAllInSet(mockSetCode);
        expect(repository.findAllInSet).toHaveBeenCalledWith(mockSetCode);
        expect(foundCards).toEqual(testUtils.mapEntitiesToDtos(mockCards));
    });

    it('should find a card by id', async () => {
        const foundCard: CardDto | null = await service.findById(1);
        expect(repository.findById).toHaveBeenCalledWith(1);
        expect(foundCard).toEqual(testUtils.mapEntityToDto(mockCards[0]));
    });

    it('should find a card by setCode and number', async () => {
        const foundCard: CardDto = await service.findBySetCodeAndNumber(mockSetCode, 1);
        expect(repository.findBySetCodeAndNumber).toHaveBeenCalledWith(mockSetCode, 1);
        expect(foundCard).toEqual(testUtils.mapEntityToDto(mockCards[0]));
    });

    it('should find a card by UUID', async () => {
        const foundCard: CardDto | null = await service.findByUuid(mockCards[0].uuid);
        expect(repository.findByUuid).toHaveBeenCalledWith(mockCards[0].uuid);
        expect(foundCard).toEqual(testUtils.mapEntityToDto(mockCards[0]));
    });
});
