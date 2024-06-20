import { Test, TestingModule } from '@nestjs/testing';
import { SetController } from '../../src/set/set.controller';
import { SetService } from '../../src/set/set.service';

describe('Set view test covers set, setInfo, setCards, cardsOwned, manaCost', () => {
  let setController: SetController;
  let setService: SetService;
  // let testSet: Set = new Set();
  // testSet.block = 'Kaladesh';
  // testSet.cards = [
  //   {
  //     manaCost: ['1', 'W', 'W'],
  //     name: 'the name of the card',
  //     number: '1',
  //     price: 0.07,
  //     rarity: 'common',
  //     totalOwned: 0,
  //     url: 'some.url/set/kld/1',
  //   },
  //   {
  //     manaCost: ['10','U', 'B', 'R', 'G', 'W/G'],
  //     name: 'the second card',
  //     number: '2',
  //     price: 3.14,
  //     rarity: 'rare',
  //     totalOwned: 1,
  //     url: 'some.url/set/kld/2',
  //   }
  // ];
  // testSet.code = 'KLD';
  // testSet.keyruneCode = 'KLD';
  // testSet.name = 'Kaladesh';
  // testSet.releaseDate = '2016-09-30';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [
        SetService,
        {
          provide: SetService,
          useValue: {
            findByCode: jest
              .fn()
              .mockImplementation((setCode: String) =>
                // TODO: create file to store mock data below
                // TODO: then load in and use as object here ?

                Promise.resolve({
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
                      manaCost: ['10','U', 'B', 'R', 'G', 'W/G'],
                      name: 'the second card',
                      number: 2,
                      price: 3.14,
                      rarity: 'rare',
                      totalOwned: 1,
                      url: 'some.url/set/kld/2',
                    }
                  ]
                }),
              ),
          }
        }
      ],
    }).compile();
    setController = module.get<SetController>(SetController);
    setService = module.get<SetService>(SetService);
  });

  it('should render template with context', () => {
    const result = setController.findBySetCode('ABC');

    console.log(result);
    expect(result).toContain('<i class="ss ss-kld ss-2x"></i>')
  });

  it('should render template with complex context', () => {
    const template = '<p>{{#if isAdmin}}Welcome, admin!{{else}}Welcome, user!{{/if}}</p>';
    const contextAdmin = { isAdmin: true };
    const contextUser = { isAdmin: false };

    // const resultAdmin = setController.renderTemplate(template, contextAdmin);
    // const resultUser = setController.renderTemplate(template, contextUser);

    // expect(resultAdmin).toBe('<p>Welcome, admin!</p>');
    // expect(resultUser).toBe('<p>Welcome, user!</p>');
  });
});
