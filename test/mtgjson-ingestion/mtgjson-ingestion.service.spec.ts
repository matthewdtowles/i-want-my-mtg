import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonApiClient } from '../../src/adapters/mtgjson-ingestion/mtgjson-api.client';
import { MtgJsonIngestionMapper } from '../../src/adapters/mtgjson-ingestion/mtgjson-ingestion.mapper';
import { MtgJsonIngestionService } from '../../src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';

describe('MtgJsonIngestionService', () => {
    let service: MtgJsonIngestionService;
    let testUtils: MtgJsonIngestionTestUtils;
    let apiClient: MtgJsonApiClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MtgJsonApiClient,
                MtgJsonIngestionService,
                MtgJsonIngestionMapper,
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
        expect(await service.fetchAllSetsMeta()).toEqual(testUtils.getExpectedCreateSetDtos());
    });

    it('should call external api to find a set by code and map to a CreateSetDto', async () => {
        jest.spyOn(apiClient, 'fetchSet').mockResolvedValue(testUtils.getMockSetDto());
        expect(await service.fetchSetByCode(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCreateSetDto());
    });

    it('getSetCards should return array of every card as CreateCardDto in given set', async () => {
        jest.spyOn(apiClient, 'fetchSet').mockResolvedValue(testUtils.getMockSetDto());
        expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCreateCardDtos());
    });
});