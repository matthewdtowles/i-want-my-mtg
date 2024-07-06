import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperService } from './data-mapper.service';

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
});
