import { Test, TestingModule } from '@nestjs/testing';
import { SetService as SetService } from './set.service';

describe('SetService', () => {
    let service: SetService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService
            ],
        }).compile();
        service = module.get<SetService>(SetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // TODO: move this to SetModule:??
    //  imports: [DataIngestionModule], // Register data ingestion module

    it('should persist all sets in given array of sets', () => {
    });
    it('data ingestion identify missing sets', () => {
    });    
    it('should return array of sets not yet saved', () => {
    });
    it('data ingestion identify missing cards in a set', () => {
    });
    it('should return array of cards for given set not yet saved', () => {
    });
    it('data ingestion ingestSetList', () => {
    });
    it('data ingestion ingestSetCards should persist all cards in given set', () => {
    });
});
