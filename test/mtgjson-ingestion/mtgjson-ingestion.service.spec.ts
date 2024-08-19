import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonIngestionService } from '../../src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { MtgJsonMapperService } from '../../src/adapters/mtgjson-ingestion/mtgjson-mapper.service';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';
import { MtgJsonApiClient } from '../../src/adapters/mtgjson-ingestion/mtgjson-api.client';

describe('MtgJsonIngestionService', () => {
    let service: MtgJsonIngestionService;
    let testUtils: MtgJsonIngestionTestUtils;
    let apiClient: MtgJsonApiClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MtgJsonApiClient,
                MtgJsonIngestionService,
                MtgJsonMapperService,
            ],
        }).compile();

        apiClient = module.get<MtgJsonApiClient>(MtgJsonApiClient);
        service = module.get<MtgJsonIngestionService>(MtgJsonIngestionService);
        testUtils = new MtgJsonIngestionTestUtils();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('getAllSets should return array of every set as CreateSetDto', async () => {
        jest.spyOn(apiClient, 'fetchSetList').mockResolvedValue(testUtils.getMockSetListArray()); 
        expect(await service.fetchAllSetsMeta()).toEqual(testUtils.getExpectedSets());
    });

    it('getSetCards should return array of every card as CreateCardDto in given set', async () => {
        jest.spyOn(apiClient, 'fetchSet').mockResolvedValue(testUtils.getMockSet());
        expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCards());
    });
});