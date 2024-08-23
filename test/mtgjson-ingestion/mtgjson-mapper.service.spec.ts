import { Test, TestingModule } from '@nestjs/testing';
import { CardSet } from '../../src/adapters/mtgjson-ingestion/dto/cardSet.dto';
import { SetDto } from '../../src/adapters/mtgjson-ingestion/dto/set.dto';
import { SetList } from '../../src/adapters/mtgjson-ingestion/dto/setList.dto';
import { MtgJsonMapperService } from '../../src/adapters/mtgjson-ingestion/mtgjson-mapper.service';
import { CreateCardDto } from '../../src/core/card/dto/create-card.dto';
import { CreateSetDto } from '../../src/core/set/dto/create-set.dto';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';

describe('MtgJsonMapperService', () => {
    let service: MtgJsonMapperService;
    let cards: CardSet[] = [];
    let set: SetDto;
    let setList: SetList[];
    let testUtils: MtgJsonIngestionTestUtils;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MtgJsonMapperService],
        }).compile();
        service = module.get<MtgJsonMapperService>(MtgJsonMapperService);
        testUtils = new MtgJsonIngestionTestUtils();
        cards = testUtils.getMockCardSetArray();
        set = testUtils.getMockSetDto();
        setList = testUtils.getMockSetListArray();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('DataMapperService map provider models to DTOs', () => {
        it('maps the Set model from DataProvider to CreateSetDto', () => {
            const expectedSet: CreateSetDto = testUtils.getExpectedCreateSetDto();
            const actualSet: CreateSetDto = service.externalToCreateSetDto(set);            
            expect(actualSet).toEqual(expectedSet);
        });

        it('map Set.CardSet model from DataProvider to CreateCardDto[]', () => {
            const expectedCards: CreateCardDto[] = testUtils.getExpectedCreateCardDtos();
            const actualCards: CreateCardDto[] = service.externalToCreateCardDtos(cards);            
            expect(actualCards).toEqual(expectedCards);
        });

        it('map SetList model from DataProvider to CreateSetDto[]', () => {
            const expectedSet: CreateSetDto[] = testUtils.getExpectedCreateSetDtos();
            const actualSet: CreateSetDto[] = service.externalToCreateSetDtos(setList);
            expect(actualSet).toEqual(expectedSet);
        })
    });
});
