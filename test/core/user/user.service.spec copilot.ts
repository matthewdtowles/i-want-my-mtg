import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { CreateUserDto, UpdateUserDto, UserDto } from "src/core/user/api/user.dto";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { User } from "src/core/user/user.entity";
import { UserMapper } from "src/core/user/user.mapper";
import { UserService } from "src/core/user/user.service";

describe("UserService", () => {
    let service: UserService;
    let repository: UserRepositoryPort;
    let mapper: UserMapper;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: UserRepositoryPort,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findByEmail: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: UserMapper,
                    useValue: {
                        createDtoToEntity: jest.fn(),
                        updateDtoToEntity: jest.fn(),
                        entityToDto: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<UserRepositoryPort>(UserRepositoryPort);
        mapper = module.get<UserMapper>(UserMapper);
    });

    it("user service should be defined", () => {
        expect(service).toBeDefined();
    });

    it("should create a user and return the user DTO", async () => {
        const createUserDto: CreateUserDto = {
            name: "Test User",
            email: "test@example.com",
            password: "password",
        };

        const user: User = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            password: "hashedPassword",
        } as User;

        const savedUser: User = { ...user };

        const expectedUserDto: UserDto = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: UserRole.User,
        };

        jest.spyOn(mapper, "createDtoToEntity").mockReturnValue(user);
        jest.spyOn(repository, "create").mockResolvedValue(savedUser);
        jest.spyOn(mapper, "entityToDto").mockReturnValue(expectedUserDto);

        await expect(service.create(createUserDto)).resolves.toEqual(expectedUserDto);
        expect(mapper.createDtoToEntity).toHaveBeenCalledWith(createUserDto);
        expect(repository.create).toHaveBeenCalledWith(user);
        expect(mapper.entityToDto).toHaveBeenCalledWith(savedUser);
    });

    it("should find a user by ID and return the user DTO", async () => {
        const user: User = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: UserRole.User,
            password: "hashedPassword",
        } as User;

        const expectedUserDto: UserDto = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: UserRole.User,
        };

        jest.spyOn(repository, "findById").mockResolvedValue(user);
        jest.spyOn(mapper, "entityToDto").mockReturnValue(expectedUserDto);

        await expect(service.findById(1)).resolves.toEqual(expectedUserDto);
        expect(repository.findById).toHaveBeenCalledWith(1);
        expect(mapper.entityToDto).toHaveBeenCalledWith(user);
    });

    it("should find a user by email and return the user DTO", async () => {
        const user: User = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
        } as User;

        const expectedUserDto: UserDto = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: UserRole.User,
        };

        jest.spyOn(repository, "findByEmail").mockResolvedValue(user);
        jest.spyOn(mapper, "entityToDto").mockReturnValue(expectedUserDto);

        await expect(service.findByEmail("test@example.com")).resolves.toEqual(expectedUserDto);
        expect(repository.findByEmail).toHaveBeenCalledWith("test@example.com");
        expect(mapper.entityToDto).toHaveBeenCalledWith(user);
    });

    it("should find the saved password by email", async () => {
        const user: User = {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            password: "hashedPassword",
            role: UserRole.User,
        } as User;

        jest.spyOn(repository, "findByEmail").mockResolvedValue(user);

        await expect(service.findSavedPassword("test@example.com")).resolves.toEqual("hashedPassword");
        expect(repository.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("should update a user and return the updated user DTO", async () => {
        const updateUserDto: UpdateUserDto = {
            id: 1,
            name: "Updated Name",
            email: "updated-email@example.com",
        };

        const user: User = {
            id: 1,
            name: "Updated Name",
            email: "updated-email@example.com",
            role: UserRole.User,
        } as User;

        const savedUser: User = { ...user };

        const expectedUserDto: UserDto = {
            id: 1,
            name: "Updated Name",
            email: "updated-email@example.com",
            role: UserRole.User,
        };

        jest.spyOn(mapper, "updateDtoToEntity").mockReturnValue(user);
        jest.spyOn(repository, "update").mockResolvedValue(savedUser);
        jest.spyOn(mapper, "entityToDto").mockReturnValue(expectedUserDto);

        await expect(service.update(updateUserDto)).resolves.toEqual(expectedUserDto);
        expect(mapper.updateDtoToEntity).toHaveBeenCalledWith(updateUserDto);
        expect(repository.update).toHaveBeenCalledWith(user);
        expect(mapper.entityToDto).toHaveBeenCalledWith(savedUser);
    });

    it("should remove a user by ID", async () => {
        jest.spyOn(repository, "delete").mockResolvedValue(undefined);

        await expect(service.remove(1)).resolves.toBeUndefined();
        expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it("should encrypt a password", async () => {
        // jest.spyOn(bcrypt, "hash").mockResolvedValue();

        await expect(service["encrypt"]("password")).resolves.toEqual("hashedPassword");
        expect(bcrypt.hash).toHaveBeenCalledWith("password", 10);
    });
});