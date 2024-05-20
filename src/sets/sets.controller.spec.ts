import { Test, TestingModule } from '@nestjs/testing';
import { SetsController } from './sets.controller';
import { SetsService } from './sets.service';

describe('SetsController', () => {
  let controller: SetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetsController],
      providers: [SetsService]
    }).compile();

    controller = module.get<SetsController>(SetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
