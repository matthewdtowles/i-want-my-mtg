import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/adapters/http/user.controller';
import { CreateUserDto } from '../../src/core/user/dto/create-user.dto';
import { UserServicePort } from '../../src/core/user/ports/user.service.port';
import { UserDto } from '../../src/core/user/dto/user.dto';

const createUserDto: CreateUserDto = {
    email: 'test-email1@iwantmymtg.com',
    name: 'test-username1',
};

const mockUser: UserDto = {
    id: 1,
    name: 'test-username1',
    email: 'test-email1@iwantmymtg.com',
    inventory: [],
};

describe('UsersController', () => {
    let controller: UserController;
    let service: UserServicePort;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserServicePort,
                    useValue: {
                        create: jest.fn().mockResolvedValue(mockUser),
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
                        findById: jest.fn().mockResolvedValue(mockUser),
                        update: jest.fn().mockResolvedValue(mockUser),
                        remove: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
        service = module.get<UserServicePort>(UserServicePort);
    });

    it('users controller should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a user', () => {
        controller.create(createUserDto);
        expect(controller.create(createUserDto)).resolves.toEqual(mockUser);
        expect(service.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should find user by given id', () => {
        expect(controller.findById(1)).resolves.toEqual(mockUser);
        expect(service.findById).toHaveBeenCalled();
    });

    it('should find user by given email', () => {
        expect(controller.findByEmail('test-email1@iwantmymtg.com')).resolves.toEqual(mockUser);
        expect(service.findByEmail).toHaveBeenCalled();
    });

    it('should remove given user', () => {
        controller.remove(mockUser);
        expect(service.remove).toHaveBeenCalled();
    });
});
