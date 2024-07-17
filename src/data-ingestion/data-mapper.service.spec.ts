import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperService } from './data-mapper.service';
import { Set } from './models/set.model';
import { CardSet } from './models/cardSet.model';
import { CreateSetDto } from '../set/dto/create-set.dto';
import { CreateCardDto } from '../card/dto/create-card.dto';
import { DataIngestionTestUtils } from './data-ingestion-test-utils';
import { SetList } from './models/setList.model';


describe('DataMapperService', () => {
    let service: DataMapperService;
    let cards: CardSet[] = [];
    let set: Set;
    let setList: SetList[];
    let testUtils: DataIngestionTestUtils;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DataMapperService],
        }).compile();
        service = module.get<DataMapperService>(DataMapperService);
        testUtils = new DataIngestionTestUtils;
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
