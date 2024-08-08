import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SetController } from './set.controller';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { create } from 'express-handlebars';
import { SetServicePort } from 'src/core/set/ports/set.service.port';
import { Set } from 'src/core/set/set';
import { SetMapper } from './set.mapper';

const mockSet: Set = {
    keyruneCode: 'kld',
    name: 'Kaladesh',
    block: 'Kaladesh',
    setCode: 'KLD',
    releaseDate: '2016-09-30',
    cards: [
        {
            id: 1,
            imgSrc: '',
            manaCost: '{1}{w}{u}{b}{r}{g}',
            name: 'the name of the card',
            number: '1',
            rarity: 'common',
            set: null,
            url: 'some.url/set/kld/1',
            uuid: '',
        },
        {
            id: 2,
            imgSrc: '',
            manaCost: '{10}{w/u}{w/b}{u/b}{u/r}{b/r}{b/g}{r/w}{r/g}{g/w}{g/u}',
            name: 'the second card',
            number: '2',
            rarity: 'rare',
            set: null,
            url: 'some.url/set/kld/2',
            uuid: '',
        }
    ],
    baseSize: 0,
    type: ''
};

describe('SetController', () => {
    let app: INestApplication;
    const mockSetService: SetServicePort = {
        create: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(mockSet),
        findAll: jest.fn(),
        findAllInFormat: jest.fn(),
        update: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [
                {
                    provide: SetServicePort,
                    useValue: mockSetService,
                },
                SetMapper,
            ],
        }).compile();

        app = moduleFixture.createNestApplication<NestExpressApplication>();
        const expressApp = app as NestExpressApplication;

        expressApp.useStaticAssets(join(__dirname, '../', 'public'));
        expressApp.setBaseViewsDir(join(__dirname, '../', 'views'));

        const hbs = create({
            layoutsDir: join(__dirname, '../', 'views', 'layouts'),
            partialsDir: join(__dirname, '../', 'views', 'partials'),
            defaultLayout: 'main',
            extname: '.hbs',
        });
        expressApp.engine('hbs', hbs.engine);
        expressApp.setViewEngine('hbs');

        // Mock the service method to return the expected set data
        mockSetService.findByCode(mockSet.setCode);
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
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/1">the name of the card</a>');
        expect(response.text).toContain('<td class="card-set-card-rarity">common</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$0.07</td>');

        expect(response.text).toContain('<td class="card-set-card-number">2</td>');
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/2">the second card</a>');
        expect(response.text).toContain('<td class="card-set-card-rarity">rare</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$3.14</td>');
    });

    it('should render manaCost partial with every mana symbol element from mocks', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

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
        expect(response.text).toContain('<span class="total-owned">0</span>');
        // 2
        expect(response.text).toContain('<span class="total-owned">1</span>');
    });
});
