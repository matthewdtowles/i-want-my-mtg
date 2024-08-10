import { Test, TestingModule } from '@nestjs/testing';
import { SetService as SetService } from '../../../src/core/set/set.service';
import { SetRepositoryPort } from '../../../src/core/set/ports/set.repository.port';
import { SetDataIngestionPort } from '../../../src/core/set/ports/set-data.ingestion.port';

const mockSetRepository: SetRepositoryPort = {
    saveSet: jest.fn(),
    setExists: jest.fn(),
    findByCode: jest.fn(),
    findByName: jest.fn(),
    findAllSets: jest.fn(),
    findAllSetsMeta: jest.fn(),
    removeById: jest.fn(),
    removeSet: jest.fn(),
};

const mockSetIngestion: SetDataIngestionPort = {
    fetchAllSets: jest.fn(),
    fetchSetByCode: jest.fn(),
    fetchAllSetsMeta: jest.fn(),
    fetchSetMetaByCode: jest.fn(),
};

describe('SetService', () => {
    let service: SetService;
    let repository: SetRepositoryPort;
    let ingestionSvc: SetDataIngestionPort;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService,
                {
                    provide: SetRepositoryPort,
                    useValue: mockSetRepository,
                },
                {
                    provide: SetDataIngestionPort,
                    useValue: mockSetIngestion,
                },
            ],
        }).compile();
        service = module.get<SetService>(SetService);
        repository = module.get<SetRepositoryPort>(SetRepositoryPort);
        ingestionSvc = module.get<SetDataIngestionPort>(SetDataIngestionPort);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should persist all sets in given array of sets', () => {
    });
    it('data ingestion identify missing sets', () => {
    });    
    it('should return array of sets not yet saved', () => {
    });
    it('data ingestion identify missing cards in a set', () => {
    });
    it('should return array of cards for given set not yet saved', () => {
    });
    it('data ingestion ingestSetList', () => {
    });
    it('data ingestion ingestSetCards should persist all cards in given set', () => {
    });
});
