import { Test, TestingModule } from '@nestjs/testing';
import { DataIngestionController } from './data-ingestion.controller';

describe('DataIngestionController', () => {
  let controller: DataIngestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataIngestionController],
    }).compile();

    controller = module.get<DataIngestionController>(DataIngestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
