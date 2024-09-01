import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from '../../../src/core/user/dto/create-user.dto';
import { UserRepositoryPort } from '../../../src/core/user/ports/user.repository.port';
import { User } from '../../../src/core/user/user.entity';
import { UserMapper } from '../../../src/core/user/user.mapper';
import { UserService } from '../../../src/core/user/user.service';
import { UpdateUserDto } from '../../../src/core/user/dto/update-user.dto';
import { UserDto } from '../../../src/core/user/dto/user.dto';

describe('UserService', () => {
    let service: UserService;
    let repository: UserRepositoryPort;

    const createUser: CreateUserDto = {
        name: 'test-username1',
        email: 'test-email1@iwantmymtg.com',
    };

    const updateUser: UpdateUserDto = {
        ...createUser
    };

    const userDto: UserDto = {
        ...createUser,
        id: 1,
        inventory: null,
    };

    const mockUser: User = new User();
    mockUser.id = 1;
    mockUser.name = 'test-username1';
    mockUser.email = 'test-email1@iwantmymtg.com';
    mockUser.inventory = null;

    const mockUserRepository: UserRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockUser),
        findByEmail: jest.fn().mockResolvedValue(mockUser),
        findById: jest.fn().mockResolvedValue(mockUser),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                UserMapper,
                {
                    provide: UserRepositoryPort,
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<UserRepositoryPort>(UserRepositoryPort);
    });

    it('user service should be defined', () => {
        expect(service).toBeDefined();
    });

    it('create should successfully insert a user', () => {
        expect(service.create(createUser)).resolves.toEqual(mockUser);
    });

    it('findById should get a single user with given id', () => {
        const repoSpy = jest.spyOn(repository, 'findById');
        expect(service.findById(1)).resolves.toEqual(userDto);
        expect(repoSpy).toHaveBeenCalledWith(1);
    });

    it('findByEmail should get a single user with given email', () => {
        const repoSpy = jest.spyOn(repository, 'findByEmail');
        expect(service.findByEmail('test-username1')).resolves.toEqual(userDto);
        expect(repoSpy).toHaveBeenCalledWith('test-username1');
    });

    it('remove should delete given user, check if user exists and return false', async () => {
        const removeSpy = jest.spyOn(repository, 'delete');
        const retVal = await service.remove(mockUser);
        expect(removeSpy).toHaveBeenCalled();
        expect(retVal).toBe(undefined);
    });
});
