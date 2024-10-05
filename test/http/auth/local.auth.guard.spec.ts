import { LocalAuthGuard } from '../../../src/adapters/http/auth/local.auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

describe('LocalAuthGuard', () => {
    const mockRequest = {
        body: {
            email: 'test@example.com',
            password: 'testPassword',
        },
        user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            inventory: [],
        },
    };
    let subject: LocalAuthGuard;
    const mockHttpArgumentsHost: Partial<HttpArgumentsHost> = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}),
        getNext: jest.fn(), // Mock the getNext function
    };

    const mockExecutionContext: Partial<ExecutionContext> = {
        switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost as HttpArgumentsHost),
    };
    beforeEach(() => {
        subject = new LocalAuthGuard();

    });

    it('should be defined', () => {
        expect(subject).toBeDefined();
    });

    it('should allow valid requests - canActivate returns true', async () => {
        const result = await subject.canActivate(mockExecutionContext as ExecutionContext);
        expect(result).toBe(true);
    });

    it('should not allow invalid requests - canActivate returns false', async () => {
        const mockInvalidContext: ExecutionContext = {
            switchToHttp: jest.fn().mockReturnValueOnce({
                getRequest: jest.fn().mockReturnValue({ ...mockRequest, user: null }),
                getResponse: jest.fn().mockReturnValue({}),
                getNext: jest.fn(), // Mock the getNext function
            }),
        } as unknown as ExecutionContext;

        // Expect UnauthorizedException to be thrown
        await expect(subject.canActivate(mockInvalidContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not authenticated', () => {
        const err = null;
        const user = null;
        const info = null;

        expect(() => subject.handleRequest(err, user, info)).toThrow(UnauthorizedException);
    });

    it('should return the user if authentication is successful', () => {
        const err = null;
        const user = { id: 1, email: 'test@example.com' };
        const info = null;

        const result = subject.handleRequest(err, user, info);
        expect(result).toEqual(user);
    });
});
