import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperService } from './data-mapper.service';
import { Set } from './models/set.model';
import { CardSet } from './models/cardSet.model';
import { CreateSetDto } from '../set/dto/create-set.dto';
import { CreateCardDto } from '../card/dto/create-card.dto';
import { Identifiers } from './models/identifiers.model';

describe('DataMapperService', () => {
    let service: DataMapperService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DataMapperService],
        }).compile();

        service = module.get<DataMapperService>(DataMapperService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // mapCreateCardDtos, mapCreateCardDto, mapCreateSetDto

    describe('DataMapperService mapCreateCardDto', () => {
        it('maps the Set model from DataProvider to CreateSetDto', () => {
            /* START TEST FIXTURES */
            const cards: CardSet[] = [];
            for (let i = 1; i < 4; i++) {
                let card = new CardSet();
                card.identifiers = new Identifiers();
                card.manaCost = '{' + i + '}{W}';
                card.name = 'Test Card Name' + i;
                card.number = i.toString();
                card.rarity = i % 2 === 1 ? 'common' : 'uncommon';
                card.identifiers.scryfallId = i + 'abc123def456';
                card.setCode = 'SET';
                cards.push(card);
            }
            let card = new CardSet();
            card.identifiers = new Identifiers();
            card.manaCost = '{U/G}{B/W}{R/U}';
            card.name = 'Test Bonus Card Name';
            card.number = '4';
            card.rarity = 'mythic'
            card.identifiers.scryfallId = '4abc123def456';
            card.setCode = 'SET';
            cards.push(card);
            const set: Set = new Set();
            set.baseSetSize = 3;
            set.block = 'Setname';
            set.cards = cards;
            set.code = 'SET';
            set.isFoilOnly = false;
            set.isNonFoilOnly = false;
            set.keyruneCode = 'SET';
            set.name = 'Setname';
            set.releaseDate = '1970-01-01';
            set.type = 'expansion';
            /* TEST FIXTURES END */

            /* EXPECTED OUTPUT */
            const cardDtos: CreateCardDto[] = [];
            for (let i = 1; i < 4; i++) {
                let cardDto = new CreateCardDto();
                cardDto.imgSrc = i + '/' + 'a/' + i + 'abc123def456';
                cardDto.manaCost = '{' + i + '}{W}';
                cardDto.name = 'Test Card Name' + i;
                cardDto.notes = [];
                cardDto.number = i.toString();
                cardDto.price = 0;
                cardDto.rarity = i % 2 === 1 ? 'common' : 'uncommon';
                cardDto.setCode = 'SET';
                cardDto.totalOwned = 0;
                cardDto.url = 'sets/set/' + i;
                cardDtos.push(cardDto);
            }
            let cardDto = new CreateCardDto();
            cardDto.imgSrc = '4/a/4abc123def456';
            cardDto.manaCost = '{U/G}{B/W}{R/U}';
            cardDto.name = 'Test Bonus Card Name';
            cardDto.notes = [];
            cardDto.number = '4';
            cardDto.price = 0;
            cardDto.rarity = 'mythic';
            cardDto.setCode = 'SET';
            cardDto.totalOwned = 0;
            cardDto.url = 'sets/set/' + 4;
            cardDtos.push(cardDto);
            const expectedSetDto: CreateSetDto = new CreateSetDto();
            expectedSetDto.block = 'Setname';
            expectedSetDto.cards = cardDtos;
            expectedSetDto.code = 'SET';
            expectedSetDto.keyruneCode = 'set';
            expectedSetDto.name = 'Setname';
            expectedSetDto.releaseDate = '1970-01-01';
            expectedSetDto.url = 'sets/set'
            
            const actualSetDto: CreateSetDto = service.mapCreateSetDto(set);            
            
            expect(actualSetDto).toEqual(expectedSetDto);
        });
    });
    
});
