import { Test, TestingModule } from '@nestjs/testing';
import { PasswordReset } from 'src/core/password-reset/password-reset.entity';
import { PasswordResetRepositoryPort } from 'src/core/password-reset/password-reset.repository.port';
import { PasswordResetService } from 'src/core/password-reset/password-reset.service';

jest.mock('src/core/auth/verification-token.util', () => ({
    generateVerificationToken: jest.fn().mockReturnValue('mock-reset-token'),
    getTokenExpiration: jest.fn().mockReturnValue(new Date('2026-02-09T05:00:00.000Z')),
}));

import * as tokenUtil from 'src/core/auth/verification-token.util';

describe('PasswordResetService', () => {
    let service: PasswordResetService;

    const mockRepository = {
        create: jest.fn(),
        findByToken: jest.fn(),
        deleteByToken: jest.fn(),
        deleteByEmail: jest.fn(),
        deleteExpired: jest.fn(),
    };

    const mockPasswordReset = new PasswordReset({
        id: 1,
        email: 'test@example.com',
        resetToken: 'mock-reset-token',
        expiresAt: new Date('2026-02-09T05:00:00.000Z'),
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordResetService,
                {
                    provide: PasswordResetRepositoryPort,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<PasswordResetService>(PasswordResetService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createResetRequest', () => {
        it('should generate token and create reset request', async () => {
            mockRepository.create.mockResolvedValue(mockPasswordReset);

            const result = await service.createResetRequest('test@example.com');

            expect(result).toEqual(mockPasswordReset);
            expect(tokenUtil.generateVerificationToken).toHaveBeenCalled();
            expect(tokenUtil.getTokenExpiration).toHaveBeenCalledWith(1);
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    resetToken: 'mock-reset-token',
                    expiresAt: new Date('2026-02-09T05:00:00.000Z'),
                })
            );
        });

        it('should delete existing reset requests before creating new one', async () => {
            mockRepository.create.mockResolvedValue(mockPasswordReset);

            await service.createResetRequest('test@example.com');

            const deleteCallOrder = mockRepository.deleteByEmail.mock.invocationCallOrder[0];
            const createCallOrder = mockRepository.create.mock.invocationCallOrder[0];
            expect(deleteCallOrder).toBeLessThan(createCallOrder);
            expect(mockRepository.deleteByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should propagate error if repository create fails', async () => {
            mockRepository.create.mockRejectedValue(new Error('Database error'));

            await expect(service.createResetRequest('test@example.com')).rejects.toThrow(
                'Database error'
            );
        });

        it('should propagate error if deleteByEmail fails during cleanup', async () => {
            mockRepository.deleteByEmail.mockRejectedValue(new Error('Delete failed'));

            await expect(service.createResetRequest('test@example.com')).rejects.toThrow(
                'Delete failed'
            );

            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('findByToken', () => {
        it('should return password reset when found', async () => {
            mockRepository.findByToken.mockResolvedValue(mockPasswordReset);

            const result = await service.findByToken('mock-reset-token');

            expect(result).toEqual(mockPasswordReset);
            expect(mockRepository.findByToken).toHaveBeenCalledWith('mock-reset-token');
        });

        it('should return null when token not found', async () => {
            mockRepository.findByToken.mockResolvedValue(null);

            const result = await service.findByToken('nonexistent-token');

            expect(result).toBeNull();
            expect(mockRepository.findByToken).toHaveBeenCalledWith('nonexistent-token');
        });

        it('should propagate repository errors', async () => {
            mockRepository.findByToken.mockRejectedValue(new Error('Database error'));

            await expect(service.findByToken('some-token')).rejects.toThrow('Database error');
        });
    });

    describe('deleteByToken', () => {
        it('should delete password reset by token', async () => {
            mockRepository.deleteByToken.mockResolvedValue(undefined);

            await service.deleteByToken('mock-reset-token');

            expect(mockRepository.deleteByToken).toHaveBeenCalledWith('mock-reset-token');
        });

        it('should propagate repository errors', async () => {
            mockRepository.deleteByToken.mockRejectedValue(new Error('Database error'));

            await expect(service.deleteByToken('some-token')).rejects.toThrow('Database error');
        });
    });

    describe('deleteExpired', () => {
        it('should return count of deleted expired password resets', async () => {
            mockRepository.deleteExpired.mockResolvedValue(5);

            const result = await service.deleteExpired();

            expect(result).toBe(5);
            expect(mockRepository.deleteExpired).toHaveBeenCalled();
        });

        it('should return zero when no expired password resets exist', async () => {
            mockRepository.deleteExpired.mockResolvedValue(0);

            const result = await service.deleteExpired();

            expect(result).toBe(0);
        });

        it('should propagate repository errors', async () => {
            mockRepository.deleteExpired.mockRejectedValue(new Error('Database error'));

            await expect(service.deleteExpired()).rejects.toThrow('Database error');
        });
    });
});
