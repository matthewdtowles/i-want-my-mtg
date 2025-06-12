import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "src/core/auth";
import { User, UserRepositoryPort, UserService } from "src/core/user";

describe("UserService", () => {
    let service: UserService;
    let repository: UserRepositoryPort;

    const createUser: User = new User({
        name: "test-username1",
        email: "test-email1@iwantmymtg.com",
        password: "abCD12#$",
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
        password: "encrypt3dP455W0Rd",
    });

    const mockUserRepository: UserRepositoryPort = {
        create: jest.fn().mockResolvedValue(mockUser),
        findByEmail: jest.fn().mockResolvedValue(mockUser),
        findById: jest.fn().mockResolvedValue(mockUser),
        delete: jest.fn(),
        update: jest.fn().mockImplementation((user: User): Promise<User> => {
            const inputUser: User = new User({
                id: user.id ?? mockUser.id,
                name: user.name ?? mockUser.name,
                email: user.email ?? mockUser.email,
                role: user.role ?? mockUser.role,
                password: user.password ?? mockUser.password,
            });
            return Promise.resolve(inputUser);
        })
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


    it("create should successfully insert a user", async () => {
        const repoSpy = jest.spyOn(repository, "create");
        await expect(service.create(createUser)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalled();
    });

    it("findById should get a single user with given id", async () => {
        const repoSpy = jest.spyOn(repository, "findById");
        await expect(service.findById(1)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalled();
    });

    it("findByEmail should get a single user with given email", async () => {
        const repoSpy = jest.spyOn(repository, "findByEmail");
        await expect(service.findByEmail(mockUser.email)).resolves.toEqual(existingUser);
        expect(repoSpy).toHaveBeenCalledWith(mockUser.email);
    });

    it("update should save given user and return result after update", async () => {
        const updateUserDto: User = new User({
            id: mockUser.id,
            name: mockUser.name,
            email: "updated-email1@iwantmymtg.com",
        });
        const expectedUserDto: User = { ...existingUser, email: updateUserDto.email };

        await expect(service.update(updateUserDto)).resolves.toEqual(expectedUserDto);

        const repoSpy = jest.spyOn(repository, "update");
        const repoInputUser: User = new User({
            id: updateUserDto.id,
            name: updateUserDto.name,
            email: updateUserDto.email,
        });
        expect(repoSpy).toHaveBeenCalledWith(repoInputUser);
    });

    it("updatePassword should update password for given user", async () => {
        const repoSpy = jest.spyOn(repository, "update");
        await expect(service.updatePassword(mockUser.id, "newPassword")).resolves.toBe(true);
        expect(repoSpy).toHaveBeenCalled();
    });

    it("remove should delete given user, check if user exists and return false", async () => {
        const deleteSpy = jest.spyOn(repository, "delete");
        expect(await service.remove(mockUser.id)).toBe(undefined);
        expect(deleteSpy).toHaveBeenCalled();
    });
});
