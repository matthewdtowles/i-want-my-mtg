import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/core/email/email.service';
import { PendingUserService } from 'src/core/user/pending-user.service';
import { SignupService } from 'src/core/user/signup.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';

describe('SignupService', () => {
    let service: SignupService;

    const mockUserService = {
        findByEmail: jest.fn(),
        createWithHashedPassword: jest.fn(),
    };
    const mockPendingUserService = {
        findByEmail: jest.fn(),
        findByToken: jest.fn(),
        createPendingUser: jest.fn(),
        deleteByEmail: jest.fn(),
        deleteByToken: jest.fn(),
    };
    const mockEmailService = {
        sendVerificationEmail: jest.fn(),
    };

    const pending = (over: Record<string, unknown> = {}) => ({
        email: 'new@example.com',
        name: 'New User',
        passwordHash: 'hashed',
        verificationToken: 'raw-token',
        isExpired: () => false,
        ...over,
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SignupService,
                { provide: UserService, useValue: mockUserService },
                { provide: PendingUserService, useValue: mockPendingUserService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();
        service = module.get<SignupService>(SignupService);
    });

    describe('initiateSignup', () => {
        it('stages a pending user and sends a verification email for a fresh address', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);
            mockPendingUserService.findByEmail.mockResolvedValue(null);
            mockPendingUserService.createPendingUser.mockResolvedValue(pending());
            mockEmailService.sendVerificationEmail.mockResolvedValue(true);

            await expect(
                service.initiateSignup('new@example.com', 'New User', 'Sup3rSecret!')
            ).resolves.toBeUndefined();

            expect(mockPendingUserService.createPendingUser).toHaveBeenCalledWith(
                'new@example.com',
                'New User',
                'Sup3rSecret!'
            );
            expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
        });

        it('returns silently for an already-registered email (no enumeration)', async () => {
            mockUserService.findByEmail.mockResolvedValue(new User({ email: 'a@b.com', name: 'x' }));

            await expect(
                service.initiateSignup('a@b.com', 'Some User', 'Sup3rSecret!')
            ).resolves.toBeUndefined();

            expect(mockPendingUserService.createPendingUser).not.toHaveBeenCalled();
            expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
        });

        it('returns silently when a non-expired pending registration exists', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);
            mockPendingUserService.findByEmail.mockResolvedValue(pending());

            await expect(
                service.initiateSignup('new@example.com', 'New User', 'Sup3rSecret!')
            ).resolves.toBeUndefined();

            expect(mockPendingUserService.createPendingUser).not.toHaveBeenCalled();
        });

        it('rolls back the pending user and throws when the email fails to send', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);
            mockPendingUserService.findByEmail.mockResolvedValue(null);
            mockPendingUserService.createPendingUser.mockResolvedValue(pending());
            mockEmailService.sendVerificationEmail.mockResolvedValue(false);

            await expect(
                service.initiateSignup('new@example.com', 'New User', 'Sup3rSecret!')
            ).rejects.toThrow('Failed to send verification email');
            expect(mockPendingUserService.deleteByEmail).toHaveBeenCalledWith('new@example.com');
        });
    });

    describe('verifyEmail', () => {
        it('promotes a valid pending user and returns the created user', async () => {
            mockPendingUserService.findByToken.mockResolvedValue(pending());
            mockUserService.findByEmail.mockResolvedValue(null);
            const created = new User({ id: 7, email: 'new@example.com', name: 'New User' });
            mockUserService.createWithHashedPassword.mockResolvedValue(created);

            const result = await service.verifyEmail('raw-token');

            expect(result.success).toBe(true);
            expect(result.user).toBe(created);
            expect(mockPendingUserService.deleteByToken).toHaveBeenCalledWith('raw-token');
        });

        it('fails for an unknown token', async () => {
            mockPendingUserService.findByToken.mockResolvedValue(null);

            const result = await service.verifyEmail('bad');

            expect(result.success).toBe(false);
            expect(result.user).toBeUndefined();
        });

        it('fails and cleans up an expired token', async () => {
            mockPendingUserService.findByToken.mockResolvedValue(pending({ isExpired: () => true }));

            const result = await service.verifyEmail('raw-token');

            expect(result.success).toBe(false);
            expect(mockPendingUserService.deleteByToken).toHaveBeenCalledWith('raw-token');
            expect(mockUserService.createWithHashedPassword).not.toHaveBeenCalled();
        });

        it('is idempotent when the user was already created (race guard)', async () => {
            const existing = new User({ id: 9, email: 'new@example.com', name: 'New User' });
            mockPendingUserService.findByToken.mockResolvedValue(pending());
            mockUserService.findByEmail.mockResolvedValue(existing);

            const result = await service.verifyEmail('raw-token');

            expect(result.success).toBe(true);
            expect(result.user).toBe(existing);
            expect(mockUserService.createWithHashedPassword).not.toHaveBeenCalled();
            expect(mockPendingUserService.deleteByToken).toHaveBeenCalledWith('raw-token');
        });
    });
});
