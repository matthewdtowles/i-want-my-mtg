import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PendingUser } from 'src/core/user/pending-user.entity';
import { PendingUserRepositoryPort } from 'src/core/user/pending-user.repository.port';
import { PendingUserService } from 'src/core/user/pending-user.service';

jest.mock('bcrypt');
jest.mock('src/core/auth/verification-token.util', () => ({
    generateVerificationToken: jest.fn().mockReturnValue('mock-verification-token'),
    getTokenExpiration: jest.fn().mockReturnValue(new Date('2026-02-09T05:00:00.000Z')),
}));

import * as tokenUtil from 'src/core/auth/verification-token.util';

describe('PendingUserService', () => {
    let service: PendingUserService;
    let repository: jest.Mocked<PendingUserRepositoryPort>;

    const mockRepository = {
        create: jest.fn(),
        findByToken: jest.fn(),
        findByEmail: jest.fn(),
        deleteByToken: jest.fn(),
        deleteByEmail: jest.fn(),
        deleteExpired: jest.fn(),
    };

    const mockPendingUser = new PendingUser({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        verificationToken: 'mock-verification-token',
        expiresAt: new Date('2026-02-09T05:00:00.000Z'),
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PendingUserService,
                {
                    provide: PendingUserRepositoryPort,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<PendingUserService>(PendingUserService);
        repository = module.get(PendingUserRepositoryPort);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createPendingUser', () => {
        it('should hash password, generate token, and create pending user', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockRepository.create.mockResolvedValue(mockPendingUser);

            const result = await service.createPendingUser(
                'test@example.com',
                'Test User',
                'plaintext-password'
            );

            expect(result).toEqual(mockPendingUser);
            expect(bcrypt.hash).toHaveBeenCalledWith('plaintext-password', 10);
            expect(tokenUtil.generateVerificationToken).toHaveBeenCalled();
            expect(tokenUtil.getTokenExpiration).toHaveBeenCalledWith(24);
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    name: 'Test User',
                    passwordHash: 'hashed-password',
                    verificationToken: 'mock-verification-token',
                    expiresAt: new Date('2026-02-09T05:00:00.000Z'),
                })
            );
        });

        it('should delete existing pending registration before creating new one', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockRepository.create.mockResolvedValue(mockPendingUser);

            await service.createPendingUser('test@example.com', 'Test User', 'password');

            const deleteCallOrder = mockRepository.deleteByEmail.mock.invocationCallOrder[0];
            const createCallOrder = mockRepository.create.mock.invocationCallOrder[0];
            expect(deleteCallOrder).toBeLessThan(createCallOrder);
            expect(mockRepository.deleteByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should propagate error if password hashing fails', async () => {
            (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

            await expect(
                service.createPendingUser('test@example.com', 'Test User', 'password')
            ).rejects.toThrow('Hashing failed');

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        it('should propagate error if repository create fails', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockRepository.create.mockRejectedValue(new Error('Database error'));

            await expect(
                service.createPendingUser('test@example.com', 'Test User', 'password')
            ).rejects.toThrow('Database error');
        });

        it('should propagate error if deleteByEmail fails during cleanup', async () => {
            mockRepository.deleteByEmail.mockRejectedValue(new Error('Delete failed'));

            await expect(
                service.createPendingUser('test@example.com', 'Test User', 'password')
            ).rejects.toThrow('Delete failed');

            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('findByToken', () => {
        it('should return pending user when found', async () => {
            mockRepository.findByToken.mockResolvedValue(mockPendingUser);

            const result = await service.findByToken('mock-verification-token');

            expect(result).toEqual(mockPendingUser);
            expect(mockRepository.findByToken).toHaveBeenCalledWith('mock-verification-token');
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

    describe('findByEmail', () => {
        it('should return pending user when found', async () => {
            mockRepository.findByEmail.mockResolvedValue(mockPendingUser);

            const result = await service.findByEmail('test@example.com');

            expect(result).toEqual(mockPendingUser);
            expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should return null when email not found', async () => {
            mockRepository.findByEmail.mockResolvedValue(null);

            const result = await service.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
            expect(mockRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
        });

        it('should propagate repository errors', async () => {
            mockRepository.findByEmail.mockRejectedValue(new Error('Database error'));

            await expect(service.findByEmail('test@example.com')).rejects.toThrow('Database error');
        });
    });

    describe('deleteByToken', () => {
        it('should delete pending user by token', async () => {
            mockRepository.deleteByToken.mockResolvedValue(undefined);

            await service.deleteByToken('mock-verification-token');

            expect(mockRepository.deleteByToken).toHaveBeenCalledWith('mock-verification-token');
        });

        it('should propagate repository errors', async () => {
            mockRepository.deleteByToken.mockRejectedValue(new Error('Database error'));

            await expect(service.deleteByToken('some-token')).rejects.toThrow('Database error');
        });
    });

    describe('deleteByEmail', () => {
        it('should delete pending user by email', async () => {
            mockRepository.deleteByEmail.mockResolvedValue(undefined);

            await service.deleteByEmail('test@example.com');

            expect(mockRepository.deleteByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should propagate repository errors', async () => {
            mockRepository.deleteByEmail.mockRejectedValue(new Error('Database error'));

            await expect(service.deleteByEmail('test@example.com')).rejects.toThrow(
                'Database error'
            );
        });
    });

    describe('deleteExpired', () => {
        it('should return count of deleted expired pending users', async () => {
            mockRepository.deleteExpired.mockResolvedValue(5);

            const result = await service.deleteExpired();

            expect(result).toBe(5);
            expect(mockRepository.deleteExpired).toHaveBeenCalled();
        });

        it('should return zero when no expired pending users exist', async () => {
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
