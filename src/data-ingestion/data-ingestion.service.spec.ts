import { Test, TestingModule } from '@nestjs/testing';
import { DataIngestionService } from './data-ingestion.service';
import { DataIngestionTestUtils } from './data-ingestion-test-utils';
import { DataProviderService } from './data-provider.service';
import { DataMapperService } from './data-mapper.service';

describe('DataIngestionService', () => {
    let service: DataIngestionService;
    let testUtils: DataIngestionTestUtils;
    let dataProvider: DataProviderService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataIngestionService,
                DataProviderService,
                DataMapperService,
            ],
        }).compile();

        service = module.get<DataIngestionService>(DataIngestionService);
        testUtils = new DataIngestionTestUtils();
        dataProvider = module.get<DataProviderService>(DataProviderService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('data ingestion getAllSets()', () => {
        it('should return array of every set as CreateSetDto', async () => {
            jest.spyOn(dataProvider, 'requestSetList').mockResolvedValue(testUtils.getMockSetListArray());
            expect(await service.fetchAllSets()).toEqual(testUtils.getExpectedSetDtos());
        });
    });

    describe('data ingestion getSetCards()', () => {
        it('should return array of every card as CreateCardDto in given set', async () => {
            jest.spyOn(dataProvider, 'requestSet').mockResolvedValue(testUtils.getMockSet());
            expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCardDtos());
        });
    });
});
