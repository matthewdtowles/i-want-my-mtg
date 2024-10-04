import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/adapters/http/auth/auth.controller';
import { AuthenticatedRequest } from '../../../src/adapters/http/auth/authenticated.request';
import { LocalAuthGuard } from '../../../src/adapters/http/auth/local.auth.guard';
import { AuthToken } from '../../../src/core/auth/auth.types';
import { AuthServicePort } from '../../../src/core/auth/ports/auth.service.port';
import { UserDto } from '../../../src/core/user/dto/user.dto';

describe('AuthController', () => {
    let authController: AuthController;
    let authService: AuthServicePort;

    const mockAuthService = {
        login: jest.fn(),
    };

    const mockAuthToken: AuthToken = {
        access_token: 'test-jwt-token',
    };

    const mockUserDto: UserDto = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        inventory: [], // You can add other fields if necessary
    };

    const mockRequest: AuthenticatedRequest = {
        user: mockUserDto,
    } as AuthenticatedRequest;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthServicePort, useValue: mockAuthService },
                LocalAuthGuard,
                Reflector, // Needed for the UseGuards functionality
                Logger,
            ],
        }).compile();

        authController = module.get<AuthController>(AuthController);
        authService = module.get<AuthServicePort>(AuthServicePort);
    });

    it('should be defined', () => {
        expect(authController).toBeDefined();
    });

    it('login should return an AuthToken when successful', async () => {
        mockAuthService.login.mockResolvedValue(mockAuthToken);
        const result = await authController.login(mockRequest);
        expect(authService.login).toHaveBeenCalledWith(mockUserDto);
        expect(result).toEqual(mockAuthToken);
    });

    it('login should return ___ when unsuccessful', async () => {
        // TODO: impl
    });
});
