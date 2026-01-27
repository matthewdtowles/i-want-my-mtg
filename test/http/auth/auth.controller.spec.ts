import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from 'src/http/auth/auth.controller';
import { AuthOrchestrator } from 'src/http/auth/auth.orchestrator';
import { AUTH_TOKEN_NAME } from 'src/http/auth/dto/auth.types';
import { UserRole } from 'src/shared/constants/user.role.enum';

describe('AuthController', () => {
    let controller: AuthController;
    let authOrchestrator: AuthOrchestrator;

    const mockAuthOrchestrator = {
        login: jest.fn(),
        logout: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthOrchestrator,
                    useValue: mockAuthOrchestrator,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authOrchestrator = module.get<AuthOrchestrator>(AuthOrchestrator);
    });

    describe('login', () => {
        it('should set JWT token in cookie and redirect on success', async () => {
            const userDto = {
                id: 1,
                name: 'Test User',
                email: 'testuser@example.com',
                role: UserRole.User,
            };

            const mockReq = { user: userDto } as any;
            const mockRes = {
                cookie: jest.fn().mockReturnThis(),
                redirect: jest.fn().mockReturnThis(),
            } as unknown as Response;

            mockAuthOrchestrator.login.mockResolvedValue({
                success: true,
                token: 'mock-jwt-token',
                redirectTo: '/user',
                statusCode: 200,
            });

            await controller.login(mockReq, mockRes);

            expect(authOrchestrator.login).toHaveBeenCalledWith(userDto);
            expect(mockRes.cookie).toHaveBeenCalledWith(
                AUTH_TOKEN_NAME,
                'mock-jwt-token',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'strict',
                    secure: false,
                    maxAge: 3600000,
                    path: '/',
                })
            );
            expect(mockRes.redirect).toHaveBeenCalledWith('/user');
        });

        it('should redirect to login with error on authentication failure', async () => {
            const userDto = {
                id: 1,
                name: 'Test User',
                email: 'testuser@example.com',
                role: UserRole.User,
            };

            const mockReq = { user: userDto } as any;
            const mockRes = {
                cookie: jest.fn().mockReturnThis(),
                redirect: jest.fn().mockReturnThis(),
            } as unknown as Response;

            mockAuthOrchestrator.login.mockResolvedValue({
                success: false,
                redirectTo: '/login?action=login&status=401&message=Authentication%20failed',
                statusCode: 401,
                error: 'Authentication failed',
            });

            await controller.login(mockReq, mockRes);

            expect(authOrchestrator.login).toHaveBeenCalledWith(userDto);
            expect(mockRes.cookie).not.toHaveBeenCalled();
            expect(mockRes.redirect).toHaveBeenCalledWith('/auth/login?error=Invalid credentials');
        });
    });

    describe('logout', () => {
        it('should clear the auth cookie and redirect', async () => {
            const userDto = {
                id: 1,
                name: 'Test User',
                email: 'testuser@example.com',
                role: UserRole.User,
            };
            const mockRes = {
                clearCookie: jest.fn(),
                redirect: jest.fn(),
            } as unknown as Response;
            const mockReq = { user: userDto } as any;
            mockAuthOrchestrator.logout.mockResolvedValue({
                success: true,
                redirectTo: '/?action=logout&status=200&message=Logged%20out',
                statusCode: 200,
            });

            await controller.logout(mockReq, mockRes);

            expect(authOrchestrator.logout).toHaveBeenCalled();
            expect(mockRes.clearCookie).toHaveBeenCalledWith(AUTH_TOKEN_NAME);
            expect(mockRes.redirect).toHaveBeenCalledWith(
                '/?action=logout&status=200&message=Logged%20out'
            );
        });
    });
});
