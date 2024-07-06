import { Test, TestingModule } from '@nestjs/testing';
import { DataIngestionService } from './data-ingestion.service';

describe('DataIngestionService', () => {
  let service: DataIngestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataIngestionService],
    }).compile();

    service = module.get<DataIngestionService>(DataIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
