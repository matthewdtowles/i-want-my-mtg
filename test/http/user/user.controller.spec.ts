import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../../src/http/user/user.controller';
import { CreateUserDto } from '../../../src/http/user/dtos/create-user.dto';
import { UserServicePort } from '../../../src/core/user/ports/user.service.port';

const createUserDto: CreateUserDto = {
    email: 'test-email1@iwantmymtg.com',
    username: 'test-username1',
    password: 'test-password1'
};

const mockUser = {
    id: 1,
    name: 'test-username1',
    email: 'test-email1@iwantmymtg.com'
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
                        authenticate: jest.fn().mockResolvedValue(mockUser),
                        createUser: jest.fn().mockResolvedValue(mockUser),
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
        expect(service.createUser).toHaveBeenCalledWith(
            createUserDto.username,
            createUserDto.email,
            createUserDto.password);
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
