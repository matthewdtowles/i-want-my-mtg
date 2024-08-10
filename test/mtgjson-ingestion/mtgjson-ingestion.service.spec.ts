import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonIngestionService } from '../../src/mtgjson-ingestion/mtgjson-ingestion.service';
import { MtgJsonMapperService } from '../../src/mtgjson-ingestion/mtgjson-mapper.service';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';

describe('MtgJsonIngestionService', () => {
    let service: MtgJsonIngestionService;
    let testUtils: MtgJsonIngestionTestUtils;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MtgJsonIngestionService,
                MtgJsonMapperService,
            ],
        }).compile();

        service = module.get<MtgJsonIngestionService>(MtgJsonIngestionService);
        testUtils = new MtgJsonIngestionTestUtils();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('getAllSets should return array of every set as CreateSetDto', async () => {
        jest.spyOn(service, 'requestSetList').mockResolvedValue(testUtils.getMockSetListArray());
        expect(await service.fetchAllSets()).toEqual(testUtils.getExpectedSets());
    });

    it('getSetCards should return array of every card as CreateCardDto in given set', async () => {
        jest.spyOn(service, 'requestSet').mockResolvedValue(testUtils.getMockSet());
        expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCards());
    });
});
