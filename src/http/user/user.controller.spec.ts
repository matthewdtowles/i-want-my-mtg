import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from '../../core/user/user.service';

const createUserDto: CreateUserDto = {
    email: 'test-email1@iwantmymtg.com',
    username: 'test-username1',
    password: 'test-password1'
};

describe('UsersController', () => {
    let controller: UserController;
    let service: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                UserService,
                {
                    provide: UserService,
                    useValue: {
                        create: jest
                            .fn()
                            .mockImplementation((user: CreateUserDto) =>
                                Promise.resolve({ id: 1, ...user }),
                            ),
                        findById: jest.fn().mockImplementation((id: string) =>
                            Promise.resolve({
                                id,
                                email: 'test-email1@iwantmymtg.com',
                                username: 'test-username1',
                                password: 'test-password1'
                            }),
                        ),
                        findByUsername: jest.fn().mockImplementation((username: string) =>
                            Promise.resolve({
                                id: 1,
                                email: 'test-email1@iwantmymtg.com',
                                username,
                                password: 'test-password1'
                            }),
                        ),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();
        controller = module.get<UserController>(UserController);
        service = module.get<UserService>(UserService);
    });

    it('users controller should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a user', () => {
        controller.create(createUserDto);
        expect(controller.create(createUserDto)).resolves.toEqual({
            id: 1,
            ...createUserDto,
        });
        expect(service.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should find user by given id', () => {
        expect(controller.findById(1)).resolves.toEqual({
            id: 1,
            ...createUserDto,
        });
        expect(service.findById).toHaveBeenCalled();
    });

    it('should find user by given email', () => {
        expect(controller.findByEmail('test-email1@iwantmymtg.com')).resolves.toEqual({
            id: 1,
            ...createUserDto,
        });
        expect(service.findByEmail).toHaveBeenCalled();
    });

    it('should remove given user', () => {
        controller.remove(1);
        expect(service.remove).toHaveBeenCalled();
    });
});
