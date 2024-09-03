import { Test, TestingModule } from '@nestjs/testing';
import { IngestionServicePort } from '../../../src/core/ingestion/ingestion.service.port';
import { SetDto } from '../../../src/core/set/dto/set.dto';
import { SetRepositoryPort } from '../../../src/core/set/ports/set.repository.port';
import { Set } from '../../../src/core/set/set.entity';
import { SetService } from '../../../src/core/set/set.service';
import { TestUtils } from '../../test-utils';
import { CreateSetDto } from '../../../src/core/set/dto/create-set.dto';
import { CreateCardDto } from '../../../src/core/card/dto/create-card.dto';
import { SetMapper } from '../../../src/core/set/set.mapper';
import { CardMapper } from '../../../src/core/card/card.mapper';

describe('SetService', () => {
    let service: SetService;
    let repository: SetRepositoryPort;
    let ingestionSvc: IngestionServicePort;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode: string = testUtils.MOCK_SET_CODE;
    const mockSets: Set[] = testUtils.getMockSets();
    const getMockCreateSetDtos: CreateSetDto[] = testUtils.getMockCreateSetDtos();
    const getMockCreateCardDtos: CreateCardDto[] = testUtils.getMockCreateCardDtos(mockSetCode);

    const mockSetRepository: SetRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockSets),
        findAllSetsMeta: jest.fn().mockResolvedValue(mockSets),
        findByCode: jest.fn().mockResolvedValue(mockSets[0]),
        findByName: jest.fn().mockResolvedValue(mockSets[0]),
        delete: jest.fn(),
    };

    const mockSetIngestion: IngestionServicePort = {
        fetchAllSetsMeta: jest.fn().mockResolvedValue(getMockCreateSetDtos),
        fetchSetByCode: jest.fn().mockResolvedValue(getMockCreateSetDtos[0]),
        fetchSetCards: jest.fn().mockResolvedValue(getMockCreateCardDtos),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService,
                {
                    provide: SetRepositoryPort,
                    useValue: mockSetRepository,
                },
                {
                    provide: IngestionServicePort,
                    useValue: mockSetIngestion,
                },
                SetMapper,
                CardMapper,
            ],
        }).compile();
        service = module.get<SetService>(SetService);
        repository = module.get<SetRepositoryPort>(SetRepositoryPort);
        ingestionSvc = module.get<IngestionServicePort>(IngestionServicePort);
    });

    afterEach(() => { 
        jest.clearAllMocks()
    });

    it('should be defined', async () => {
        expect(service).toBeDefined();
    });

    it('should save sets and return saved sets', async () => {
        const savedSets: SetDto[] = await service.save(testUtils.getMockCreateSetDtos());
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedSets).toEqual(testUtils.mapSetEntitiesToDtos(mockSets))
    });

    it('should find all sets - cards not included', async () => {
        const foundSets: SetDto[] = await service.findAll();
        expect(repository.findAllSetsMeta).toHaveBeenCalledTimes(1);
        expect(foundSets).toEqual(testUtils.mapSetEntitiesToDtos(mockSets));
    });

    it('should find all sets in given format - cards not included', async () => {
        const foundSets: SetDto[] = await service.findAllInFormat('standard');
        expect(repository.findAllSetsMeta).toHaveBeenCalledTimes(1);
        expect(foundSets).toEqual(testUtils.mapSetEntitiesToDtos(mockSets));
    });

    it('should find set with cards by given set code', async () => {
        const foundSetWithCards: SetDto = await service.findByCode(mockSetCode);
        expect(repository.findByCode).toHaveBeenCalledTimes(1);
        expect(foundSetWithCards).toEqual(testUtils.mapSetEntityToDto(mockSets[0]))
    });
});
