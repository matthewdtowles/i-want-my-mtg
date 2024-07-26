import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonIngestionService } from './mtgjson-ingestion.service';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';
import { MtgJsonMapperService } from './mtgjson-mapper.service';

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
        expect(await service.fetchAllSets()).toEqual(testUtils.getExpectedSetDtos());
    });

    it('getSetCards should return array of every card as CreateCardDto in given set', async () => {
        jest.spyOn(service, 'requestSet').mockResolvedValue(testUtils.getMockSet());
        expect(await service.fetchSetCards(testUtils.MOCK_SET_CODE)).toEqual(testUtils.getExpectedCardDtos());
    });
});
