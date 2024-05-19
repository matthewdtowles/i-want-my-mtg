import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

const createUserDto: CreateUserDto = {
  username: 'test-username1',
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: UsersService,
          useValue: {
            create: jest
              .fn()
              .mockImplementation((user: CreateUserDto) =>
                Promise.resolve({ id: '1', ...user }),
            ),
            findById: jest.fn().mockImplementation((id: string) => 
              Promise.resolve({
                username: 'test-username1',
                id,
              }),
            ),
            findByUsername: jest.fn().mockImplementation((username: string) =>
              Promise.resolve({
                id: '1',
                username
              }),
            ),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should create a user', () => {
      controller.create(createUserDto);
      expect(controller.create(createUserDto)).resolves.toEqual({
        id: '1',
        ...createUserDto,
      });
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findById()', () => {
    it('should find user by given id', () => {
      expect(controller.findById(1)).resolves.toEqual({
        username: 'test-username1',
        id: 1,
      });
      expect(service.findById).toHaveBeenCalled();
    });
  });

  describe('findByUsername()', () => {
    it('should find user by given username', () => {
      expect(controller.findByUsername('test-username1')).resolves.toEqual({
        username: 'test-username1',
        id: 1,
      });
      expect(service.findByUsername).toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('should remove given user', () => {
      controller.remove('1');
      expect(service.remove).toHaveBeenCalled();
    });
  });
});
