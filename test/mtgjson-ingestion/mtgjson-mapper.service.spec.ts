import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonMapperService } from '../../src/mtgjson-ingestion/mtgjson-mapper.service';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';
import { CardSet } from '../../src/mtgjson-ingestion/dtos/cardSet.dto'
import { SetDto } from '../../src/mtgjson-ingestion/dtos/set.dto';
import { SetList } from '../../src/mtgjson-ingestion/dtos/setList.dto';
import { Set } from '../../src/core/set/set';
import { Card } from '../../src/core/card/card';

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
        set = testUtils.getMockSet();
        setList = testUtils.getMockSetListArray();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('DataMapperService map provider models to DTOs', () => {
        it('maps the Set model from DataProvider to CreateSetDto', () => {
            const expectedSet: Set = testUtils.getExpectedSet();
            const actualSet: Set = service.mapSetMetaToSet(set);            
            expect(actualSet).toEqual(expectedSet);
        });

        it('map Set.CardSet model from DataProvider to CreateCardDto[]', () => {
            const expectedCards: Card[] = testUtils.getExpectedCards();
            const actualCards: Card[] = service.mapSetCardsToCards(cards);            
            expect(actualCards).toEqual(expectedCards);
        });

        it('map SetList model from DataProvider to CreateSetDto[]', () => {
            const expectedSet: Set[] = testUtils.getExpectedSets();
            const actualSet: Set[] = service.mapSetMetaListToSets(setList);
            expect(actualSet).toEqual(expectedSet);
        })
    });
});
