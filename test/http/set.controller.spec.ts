import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { create } from 'express-handlebars';
import { join } from 'path';
import * as request from 'supertest';
import { SetController } from '../../src/adapters/http/set.controller';
import { CardServicePort } from '../../src/core/card/api/card.service.port';
import { SetDto } from '../../src/core/set/api/set.dto';
import { SetServicePort } from '../../src/core/set/api/set.service.port';

const mockSet: SetDto = {
    keyruneCode: 'kld',
    name: 'Kaladesh',
    block: 'Kaladesh',
    code: 'KLD',
    releaseDate: '2016-09-30',
    cards: [
        {
            id: 1,
            imgSrc: '',
            isReserved: false,
            manaCost: ['1', 'w', 'u', 'b', 'r', 'g'],
            name: 'the name of the card',
            number: '1',
            rarity: 'common',
            setCode: 'KLD',
            url: 'some.url/set/kld/1',
            uuid: '',
        },
        {
            id: 2,
            imgSrc: '',
            manaCost: ['10', 'wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rw', 'rg', 'gw', 'gu'],
            name: 'the second card',
            number: '2',
            rarity: 'rare',
            setCode: 'KLD',
            url: 'some.url/set/kld/2',
            uuid: '',
        }
    ],
    baseSize: 0,
    type: '',
    url: '',
};

describe('SetController', () => {
    let app: INestApplication;
    const mockSetService: SetServicePort = {
        findByCode: jest.fn().mockResolvedValue(mockSet),
        findAll: jest.fn(),
        findAllInFormat: jest.fn(),
        save: jest.fn(),
    };

    const mockCardService: CardServicePort = {
        save: jest.fn(),
        findAllInSet: jest.fn(),
        findAllWithName: jest.fn(),
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        findByUuid: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [
                {
                    provide: SetServicePort,
                    useValue: mockSetService,
                },
                {
                    provide: CardServicePort,
                    useValue: mockCardService,
                }
            ],
        }).compile();

        app = moduleFixture.createNestApplication<NestExpressApplication>();
        const expressApp = app as NestExpressApplication;

        expressApp.useStaticAssets(join(__dirname, './', 'public'));
        expressApp.setBaseViewsDir(join(__dirname, './', 'views'));

        const hbs = create({
            layoutsDir: join(__dirname, './', 'views', 'layouts'),
            partialsDir: join(__dirname, './', 'views', 'partials'),
            defaultLayout: 'main',
            extname: '.hbs',
        });
        expressApp.engine('hbs', hbs.engine);
        expressApp.setViewEngine('hbs');

        // Mock the service method to return the expected set data
        mockSetService.findByCode(mockSet.code);
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });


    it('should render set template with mana.css cdn link', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);
        expect(response.text).toContain('<link href="//cdn.jsdelivr.net/npm/mana-font@latest/css/mana.css" rel="stylesheet" type="text/css" />');
    });

    it('should render setInfo partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);
        expect(response.text).toContain('<i class="ss ss-kld ss-2x"></i>');
        expect(response.text).toContain('<span id="set-name">Kaladesh</span>');
        expect(response.text).toContain('<li id="set-metadata-block">Block: Kaladesh</li>');
        expect(response.text).toContain('<li id="set-metadata-code">Code: KLD</li>');
        expect(response.text).toContain('<li id="set-metadata-release-date">Release Date: 2016-09-30</li>');
    });

    it('should render setCards partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        expect(response.text).toContain('<td class="card-set-card-number">1</td>');
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/1">the name of the card</a>'); //TODO: fix
        expect(response.text).toContain('<td class="card-set-card-rarity">common</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$0.00</td>');

        expect(response.text).toContain('<td class="card-set-card-number">2</td>');
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/2">the second card</a>');
        expect(response.text).toContain('<td class="card-set-card-rarity">rare</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$0.00</td>');
    });

    it('should render manaCost partial with every mana symbol element from mocks', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        // TODO: fix
        // card 1
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-1"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-w"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-u"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-b"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-r"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-g"></i>');

        // card 2
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-10"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-wu"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-wb"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-ub"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-ur"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-br"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-bg"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-rw"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-rg"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-gw"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-gu"></i>');
    });


    it('should render cardsOwned partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);
        // card 1
        expect(response.text).toContain('class="increment-quantity"');
        // 2
        expect(response.text).toContain('class="decrement-quantity"');
    });
});
