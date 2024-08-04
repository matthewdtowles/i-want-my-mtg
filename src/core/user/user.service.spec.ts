import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './user';
import { UserRepositoryPort } from './ports/user.repository.port';

const mockUser: User = new User(1, 'test-username1', 'test-email1@iwantmymtg.com');
    
const mockUserRepository = {
    saveUser: jest.fn().mockResolvedValue(mockUser),
    userExists: jest.fn().mockResolvedValue(false),
    findById: jest.fn().mockResolvedValue(mockUser),
    findByUsername: jest.fn().mockResolvedValue(mockUser),
    removeById: jest.fn(),
    removeUser: jest.fn(),
    delete: jest.fn(),
    findOneBy: jest.fn().mockResolvedValue(mockUser),
};

describe('UserService', () => {
    let service: UserService;
    let repository: typeof mockUserRepository;

    const user: User = new User(null, 'test-username1', 'test-email1@iwantmymtg.com');

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
        repository = module.get(UserRepositoryPort);
    });

    it('users service should be defined', () => {
        expect(service).toBeDefined();
    });

    it('create should successfully insert a user', () => {
        expect(service.createUser(user)).resolves.toEqual(mockUser);
    });

    it('findById should get a single user with passed id', () => {
        const repoSpy = jest.spyOn(repository, 'findById');
        expect(service.findById(1)).resolves.toEqual(mockUser);
        expect(repoSpy).toHaveBeenCalledWith(1);
    });

    it('findByUsername should get a single user with passed username', () => {
        const repoSpy = jest.spyOn(repository, 'findByUsername');
        expect(service.findByUsername('test-username1')).resolves.toEqual(mockUser);
        expect(repoSpy).toHaveBeenCalledWith('test-username1');
    });

    it('remove should delete given user, check if user exists and return false', async () => {
        const removeSpy = jest.spyOn(repository, 'removeUser');
        const existsSpy = jest.spyOn(repository, 'userExists');
        const retVal = await service.remove(user);
        expect(removeSpy).toHaveBeenCalledWith(user);
        expect(existsSpy).toHaveBeenCalledWith(user);
        expect(retVal).toBe(false);
    });
});
