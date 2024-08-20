import { Test, TestingModule } from '@nestjs/testing';
import { IngestionServicePort } from '../../../src/core/ingestion/ingestion.service.port';
import { SetRepositoryPort } from '../../../src/core/set/ports/set.repository.port';
import { Set } from '../../../src/core/set/set.entity';
import { SetService } from '../../../src/core/set/set.service';
import { TestUtils } from '../../test-utils';

describe('SetService', () => {
    const testUtils: TestUtils = new TestUtils();
    const mockSavedSets: Set[] = testUtils.getMockSets();
    const mockSavedSet: Set = testUtils.getMockSet(testUtils.MOCK_SET_CODE);
    const inputSet: Set = testUtils.getMockSet(testUtils.MOCK_SET_CODE);
    inputSet.cards = testUtils.getMockSetCards(inputSet.setCode);

    const mockSetRepository: SetRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockSavedSet),
        findByCode: jest.fn().mockResolvedValue(mockSavedSet),
        findByName: jest.fn().mockResolvedValue(mockSavedSet),
        findAllSetsMeta: jest.fn().mockResolvedValue(mockSavedSets),
        delete: jest.fn(),
    };

    const mockSetIngestion: IngestionServicePort = {
        fetchSetByCode: jest.fn().mockResolvedValue(inputSet),
        fetchAllSetsMeta: jest.fn().mockResolvedValue(mockSavedSets),
        fetchSetCards: jest.fn().mockResolvedValue(testUtils.getMockSetCards(testUtils.MOCK_SET_CODE)),
    };

    let service: SetService;
    let repository: SetRepositoryPort;
    let ingestionSvc: IngestionServicePort;

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
            ],
        }).compile();
        service = module.get<SetService>(SetService);
        repository = module.get<SetRepositoryPort>(SetRepositoryPort);
        ingestionSvc = module.get<IngestionServicePort>(IngestionServicePort);
    });

    it('should be defined', async () => {
        expect(service).toBeDefined();
    });

    it('saves set and returns saved set if set does not exist', async () => {
        // const repoSaveSet = jest.spyOn(repository, 'save');
    });

    it('returns saved instance of given set and does not save if set exists', async () => {

    });

    it('finds all sets without cards (i.e.: metadata)', async () => {

    });

    // TODO: needed? How should we trigger ingestion of set data?
    it('finds all sets without cards (i.e.: metadata) after ingesting', async () => {

    });

    it('find all sets metadata in given format', async () => {

    });

    it('find all sets metadata in given format after ingesting', async () => {

    });

    it('finds set with cards by given set code', async () => {

    });

    it('finds set with cards by given set code after ingesting', async () => {

    });

    it('updates and returns updated version of given set', async () => {
        // const repoSaveSet = jest.spyOn(repository, 'saveSet');
        // const updatedSet: Set = await service.update(mockSavedSet);
        // expect(repoSaveSet).toHaveBeenCalledWith(mockSavedSet);
        // expect(updatedSet).toEqual(mockSavedSet);
    });
});
