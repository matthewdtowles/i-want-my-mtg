import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock } from 'node:test';

const mockUser = {
  username: 'test-username1',
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findById: jest.fn().mockResolvedValue(mockUser),
            findByUsername: jest.fn().mockResolvedValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should successfully insert a user', () => {
      const user = {
        username: 'test-username1',
      };
      expect(
        service.create({
          username: 'test-username1',
        }),
      ).resolves.toEqual(user);
    });
  });

  describe('findById()', () => {
    it('should get a single user with passed id', () => {
      const repoSpy = jest.spyOn(repository, 'findOneBy');
      expect(service.findById(1)).resolves.toEqual(mockUser);
      expect(repoSpy).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('findByUsername()', () => {
    it('should get a single user with passed username', () => {
      const repoSpy = jest.spyOn(repository, 'findOneBy');
      expect(service.findByUsername('test-username1')).resolves.toEqual(mockUser);
      expect(repoSpy).toHaveBeenCalledWith({ username: 'test-username1' });
    });
  });

  describe('remove()', () => {
    it('should call remove with the passed id', async () => {
      const removeSpy = jest.spyOn(repository, 'delete');
      const retVal = await service.remove('1');
      expect(removeSpy).toHaveBeenCalledWith('1');
      expect(retVal).toBeUndefined();
    });
  });
});
