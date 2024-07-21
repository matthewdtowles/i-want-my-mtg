import { Test, TestingModule } from '@nestjs/testing';
import { SetService as SetService } from './set.service';

describe('SetService', () => {
    let service: SetService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SetService],
        }).compile();

        service = module.get<SetService>(SetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    // TODO: move to Card/Set Service(s)
    // describe('data ingestion ingestSetList', () => {
    //   it('should persist all sets in given array of sets', () => {

    //   });
    // });

    // describe('data ingestion ingestSetCards', () => {
    //   it('should persist all cards in given set', () => {

    //   })
    // });

    // describe('data ingestion identify missing sets', () => {
    //   it('should return array of sets not yet saved', () => {

    //   });
    // });

    // describe('data ingestion identify missing cards in a set', () => {
    //   it('should return array of cards for given set not yet saved', () => {

    //   });
    // })
});
