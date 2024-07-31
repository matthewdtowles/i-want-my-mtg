import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserRepository } from './ports/user.repository';

const mockUser: User = new User();
mockUser.id = 1;
mockUser.email = 'test-email1@iwantmymtg.com';
mockUser.username = 'test-username1';
mockUser.password = 'test-password1';
    
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

    const user: User = new User();
    user.email = 'test-email1@iwantmymtg.com';
    user.username = 'test-username1';
    user.password = 'test-password1';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: UserRepository,
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get(UserRepository);
    });

    it('users service should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('users service create()', () => {
        it('should successfully insert a user', () => {

            expect(
                service.create(user),
            ).resolves.toEqual(mockUser);
        });
    });

    describe('users service findById()', () => {
        it('should get a single user with passed id', () => {
            const repoSpy = jest.spyOn(repository, 'findOneBy');
            expect(service.findById(1)).resolves.toEqual(mockUser);
            expect(repoSpy).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('users service findByUsername()', () => {
        it('should get a single user with passed username', () => {
            const repoSpy = jest.spyOn(repository, 'findOneBy');
            expect(service.findByUsername('test-username1')).resolves.toEqual(mockUser);
            expect(repoSpy).toHaveBeenCalledWith({ username: 'test-username1' });
        });
    });

    describe('users service remove()', () => {
        it('should call remove with the passed id', async () => {
            const removeSpy = jest.spyOn(repository, 'delete');
            const retVal = await service.remove(user);
            expect(removeSpy).toHaveBeenCalledWith(1);
            expect(retVal).toBeUndefined();
        });
    });
});
