import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

const mockUser = {
    id: 1,
    email: 'test-email1@iwantmymtg.com',
    username: 'test-username1',
    password: 'test-password1'
};

describe('UserService', () => {
    let service: UserService;
    let repository: Repository<User>;
    const user: User = new User();
    user.email = 'test-email1@iwantmymtg.com';
    user.username = 'test-username1';
    user.password = 'test-password1';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findById: jest.fn().mockResolvedValue(mockUser),
                        findByUsername: jest.fn().mockResolvedValue(mockUser),
                        findOneBy: jest.fn().mockResolvedValue(mockUser),
                        save: jest.fn().mockResolvedValue(mockUser),
                        remove: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<Repository<User>>(getRepositoryToken(User));
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
