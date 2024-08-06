import { Test, TestingModule } from '@nestjs/testing';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { SetDto } from './dtos/set.dto';
import { CardSet } from './dtos/cardSet.dto';
import { MtgJsonIngestionTestUtils } from './mtgjson-ingestion-test-utils';
import { SetList } from './dtos/setList.dto';
import { CreateCardDto } from 'src/http/card/dtos/create-card.dto';
import { CreateSetDto } from 'src/http/set/dtos/create-set.dto';


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
            const expectedSetDto: CreateSetDto = testUtils.getExpectedSetDto();
            const actualSetDto: CreateSetDto = service.mapCreateSetDto(set);            
            expect(actualSetDto).toEqual(expectedSetDto);
        });

        it('map Set.CardSet model from DataProvider to CreateCardDto[]', () => {
            const expectedCardDtos: CreateCardDto[] = testUtils.getExpectedCardDtos();
            const actualCardDtos: CreateCardDto[] = service.mapCreateCardDtos(cards);            
            expect(actualCardDtos).toEqual(expectedCardDtos);
        });

        it('map SetList model from DataProvider to CreateSetDto[]', () => {
            const expectedSetDtos: CreateSetDto[] = testUtils.getExpectedSetDtos();
            const actualSetDtos: CreateSetDto[] = service.mapCreateSetDtos(setList);
            expect(actualSetDtos).toEqual(expectedSetDtos);
        })
    });
});
