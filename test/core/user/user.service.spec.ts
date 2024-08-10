import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../src/core/user/user.service';
import { User } from '../../../src/core/user/user';
import { UserRepositoryPort } from '../../../src/core/user/ports/user.repository.port';

const mockUser: User = new User(1, 'test-username1', 'test-email1@iwantmymtg.com');
    
const mockUserRepository: UserRepositoryPort = {
    emailExists: jest.fn().mockResolvedValue(false),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    findById: jest.fn().mockResolvedValue(mockUser),
    getPasswordHash: jest.fn().mockResolvedValue("qwertyuiop"),
    removeById: jest.fn(),
    removeUser: jest.fn(),
    save: jest.fn().mockResolvedValue(mockUser),
    userExists: jest.fn().mockResolvedValue(false),
};

describe('UserService', () => {
    let service: UserService;
    let repository: UserRepositoryPort;

    const user: User = new User(0, 'test-username1', 'test-email1@iwantmymtg.com');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
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
        expect(service.createUser(user.name, user.email, "password")).resolves.toEqual(mockUser);
    });

    it('findById should get a single user with given id', () => {
        const repoSpy = jest.spyOn(repository, 'findById');
        expect(service.findById(1)).resolves.toEqual(mockUser);
        expect(repoSpy).toHaveBeenCalledWith(1);
    });

    it('findByEmail should get a single user with given email', () => {
        const repoSpy = jest.spyOn(repository, 'findByEmail');
        expect(service.findByEmail('test-username1')).resolves.toEqual(mockUser);
        expect(repoSpy).toHaveBeenCalledWith('test-username1');
    });

    it('remove should delete given user, check if user exists and return false', async () => {
        const removeSpy = jest.spyOn(repository, 'removeById');
        const retVal = await service.remove(user.id);
        expect(removeSpy).toHaveBeenCalledWith(user.id);
        expect(retVal).toBe(undefined);
    });
});
