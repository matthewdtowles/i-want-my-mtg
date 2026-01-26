import { Test, TestingModule } from '@nestjs/testing';
import { User } from 'src/core/user/user.entity';
import { UserRepositoryPort } from 'src/core/user/user.repository.port';
import { UserService } from 'src/core/user/user.service';
import { UserRole } from 'src/shared/constants/user.role.enum';

describe('UserService', () => {
    let service: UserService;
    let repository: UserRepositoryPort;

    const createUser: User = new User({
        name: 'test-username1',
        email: 'test-email1@iwantmymtg.com',
        password: 'abCD12#$',
        role: UserRole.User,
    });

    const existingUser: User = new User({
        id: 1,
        name: createUser.name,
        email: createUser.email,
        role: UserRole.User,
    });

    const mockUser: User = new User({
        id: 1,
        name: createUser.name,
        email: createUser.email,
        role: UserRole.User,
        password: 'encrypt3dP455W0Rd',
    });

    const mockUserRepository: UserRepositoryPort = {
        create: jest.fn().mockResolvedValue(existingUser),
        findByEmail: jest.fn().mockResolvedValue(existingUser),
        findById: jest.fn().mockResolvedValue(existingUser),
        delete: jest.fn(),
        update: jest.fn().mockImplementation(async (user: User) => user),
    };

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

    it('create should successfully insert a user', async () => {
        const repoSpy = jest.spyOn(repository, 'create');
        await expect(service.create(createUser)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalled();
    });

    it('findById should get a single user with given id', async () => {
        const repoSpy = jest.spyOn(repository, 'findById');
        await expect(service.findById(1)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalled();
    });

    it('findByEmail should get a single user with given email', async () => {
        const repoSpy = jest.spyOn(repository, 'findByEmail');
        await expect(service.findByEmail(mockUser.email)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalledWith(mockUser.email);
    });

    it('update should save given user and return result after update', async () => {
        const updateUser: User = new User({
            id: mockUser.id,
            name: mockUser.name,
            email: 'updated-email1@iwantmymtg.com',
            role: mockUser.role,
        });
        const expectedUser: User = { ...existingUser, email: updateUser.email };

        await expect(service.update(updateUser)).resolves.toEqual(expectedUser);

        const repoSpy = jest.spyOn(repository, 'update');
        expect(repoSpy).toHaveBeenCalledWith(updateUser);
    });

    it('updatePassword should update password for given user', async () => {
        const repoSpy = jest.spyOn(repository, 'update');
        await expect(service.updatePassword(mockUser, 'newPassword')).resolves.toBe(true);
        expect(repoSpy).toHaveBeenCalled();
    });

    it('remove should delete given user, check if user exists and return false', async () => {
        const deleteSpy = jest.spyOn(repository, 'delete');
        expect(await service.remove(mockUser.id)).toBe(undefined);
        expect(deleteSpy).toHaveBeenCalled();
    });
});
