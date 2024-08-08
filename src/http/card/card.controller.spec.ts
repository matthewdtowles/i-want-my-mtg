import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from './card.controller';
import { CardServicePort } from 'src/core/card/ports/card.service.port';

describe('CardController', () => {
  let controller: CardController;
  let mockCardService = { 
    
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: CardServicePort,
          useValue: mockCardService,
        }
      ],
    }).compile();

    controller = module.get<CardController>(CardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
