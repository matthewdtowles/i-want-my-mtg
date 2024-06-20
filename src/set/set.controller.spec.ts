import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SetController } from './set.controller';
import { SetService } from './set.service';
import * as fs from 'fs';
import * as path from 'path';

describe('SetController', () => {
  let app: INestApplication;
  let setService = { findByCode: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [
        {
          provide: SetService,
          useValue: setService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should render template with context', async () => {
    // Mock the service method to return the expected set data
    setService.findByCode.mockResolvedValue({
      keyRuneCode: 'KLD',
      name: 'Kaladesh',
      block: 'Kaladesh',
      code: 'KLD',
      releaseDate: '2016-09-30',
      cards: [
        {
          manaCost: ['1', 'W', 'W'],
          name: 'the name of the card',
          number: 1,
          price: 0.07,
          rarity: 'common',
          totalOwned: 0,
          url: 'some.url/set/kld/1',
        },
        {
          manaCost: ['10', 'U', 'B', 'R', 'G', 'W/G'],
          name: 'the second card',
          number: 2,
          price: 3.14,
          rarity: 'rare',
          totalOwned: 1,
          url: 'some.url/set/kld/2',
        }
      ]
    });

    const response = await request(app.getHttpServer())
      .get('/sets/KLD')
      .expect(200);

    expect(response.text).toContain('<i class="ss ss-kld ss-2x"></i>');
  });
});
