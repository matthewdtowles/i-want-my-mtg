import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { CardMapper } from "src/adapters/http/card/card.mapper";
import { InventoryMapper } from "src/adapters/http/inventory/inventory.mapper";
import { CreateUserDto, UserDto, UpdateUserDto } from "src/adapters/http/user/user.dto";
import { UserMapper } from "src/adapters/http/user/user.mapper";
import { User, UserRepositoryPort, UserService } from "src/core/user";

describe("UserService", () => {
    let service: UserService;
    let repository: UserRepositoryPort;

    const createUser: CreateUserDto = {
        name: "test-username1",
        email: "test-email1@iwantmymtg.com",
        password: "abCD12#$",
    };

    const userDto: UserDto = {
        id: 1,
        name: createUser.name,
        email: createUser.email,
        role: UserRole.User,
    };

    const mockUser: User = new User();
    mockUser.id = 1;
    mockUser.name = createUser.name;
    mockUser.email = createUser.email;
    mockUser.password = "encrypt3dP455W0Rd";
    mockUser.role = UserRole.User;

    const mockUserRepository: UserRepositoryPort = {
        create: jest.fn().mockResolvedValue(mockUser),
        findByEmail: jest.fn().mockResolvedValue(mockUser),
        findById: jest.fn().mockResolvedValue(mockUser),
        delete: jest.fn(),
        update: jest.fn().mockImplementation((user: User): Promise<User> => {
            const inputUser: User = new User();
            inputUser.id = user.id ?? mockUser.id;
            inputUser.name = user.name ?? mockUser.name;
            inputUser.email = user.email ?? mockUser.email;
            inputUser.role = user.role ?? mockUser.role;
            inputUser.password = user.password ?? mockUser.password;
            return Promise.resolve(inputUser);
        })
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
                InventoryMapper,
                CardMapper,
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<UserRepositoryPort>(UserRepositoryPort);
    });

    it("user service should be defined", () => {
        expect(service).toBeDefined();
    });

    it("create should successfully insert a user", async () => {
        const repoSpy = jest.spyOn(repository, "create");
        await expect(service.create(createUser)).resolves.toEqual(userDto);
        expect(repoSpy).toHaveBeenCalled();
    });

    it("findById should get a single user with given id", async () => {
        const repoSpy = jest.spyOn(repository, "findById");
        await expect(service.findById(1)).resolves.toEqual(userDto);
        expect(repoSpy).toHaveBeenCalled();
    });

    it("findByEmail should get a single user with given email", async () => {
        const repoSpy = jest.spyOn(repository, "findByEmail");
        await expect(service.findByEmail(mockUser.email)).resolves.toEqual(userDto);
        expect(repoSpy).toHaveBeenCalledWith(mockUser.email);
    });

    it("update should save given user and return result after update", async () => {
        const updateUserDto: UpdateUserDto = {
            id: mockUser.id,
            name: mockUser.name,
            email: "updated-email1@iwantmymtg.com",
        };
        const expectedUserDto: UserDto = { ...userDto, email: updateUserDto.email };

        await expect(service.update(updateUserDto)).resolves.toEqual(expectedUserDto);

        const repoSpy = jest.spyOn(repository, "update");
        const repoInputUser: User = new User();
        repoInputUser.id = updateUserDto.id;
        repoInputUser.name = updateUserDto.name;
        repoInputUser.email = updateUserDto.email;
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
