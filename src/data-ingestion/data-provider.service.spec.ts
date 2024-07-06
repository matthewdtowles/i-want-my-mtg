import { Test, TestingModule } from '@nestjs/testing';
import { DataProviderService } from './data-provider.service';

describe('DataProviderService', () => {
  let service: DataProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataProviderService],
    }).compile();

    service = module.get<DataProviderService>(DataProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
