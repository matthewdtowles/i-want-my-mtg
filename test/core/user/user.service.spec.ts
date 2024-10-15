import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "../../../src/core/card/card.mapper";
import { InventoryMapper } from "../../../src/core/inventory/inventory.mapper";
import { CreateUserDto } from "../../../src/core/user/dto/create-user.dto";
import { UserDto } from "../../../src/core/user/dto/user.dto";
import { UserRepositoryPort } from "../../../src/core/user/ports/user.repository.port";
import { User } from "../../../src/core/user/user.entity";
import { UserMapper } from "../../../src/core/user/user.mapper";
import { UserService } from "../../../src/core/user/user.service";

describe("UserService", () => {
  let service: UserService;
  let repository: UserRepositoryPort;

  const createUser: CreateUserDto = {
    name: "test-username1",
    email: "test-email1@iwantmymtg.com",
    password: "abCD12#$",
    role: "user",
  };

  const userDto: UserDto = {
    id: 1,
    name: createUser.name,
    email: createUser.email,
    inventory: [],
    role: createUser.role,
  };

  const mockUser: User = new User();
  mockUser.id = 1;
  mockUser.name = createUser.name; 
  mockUser.email = createUser.email;
  mockUser.password = "encrypt3dP455W0Rd";
  mockUser.inventory = [];
  mockUser.role = createUser.role;

  const mockUserRepository: UserRepositoryPort = {
    create: jest.fn().mockResolvedValue(mockUser),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    findById: jest.fn().mockResolvedValue(mockUser),
    update: jest.fn().mockResolvedValue(mockUser),
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
    expect(service.create(createUser)).resolves.toEqual(userDto);
  });

  it("findById should get a single user with given id", async () => {
    const repoSpy = jest.spyOn(repository, "findById");
    expect(service.findById(1)).resolves.toEqual(userDto);
    expect(repoSpy).toHaveBeenCalled();
  });

  it("findByEmail should get a single user with given email", async () => {
    const repoSpy = jest.spyOn(repository, "findByEmail");
    expect(service.findByEmail(mockUser.email)).resolves.toEqual(userDto);
    expect(repoSpy).toHaveBeenCalledWith(mockUser.email);
  });

  it("remove should delete given user, check if user exists and return false", async () => {
    const deleteSpy = jest.spyOn(repository, "delete");
    expect(await service.remove(mockUser.id)).toBe(undefined);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
