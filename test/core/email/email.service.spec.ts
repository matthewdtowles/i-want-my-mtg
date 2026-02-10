import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from 'src/core/email/email.service';

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn(),
        verify: jest.fn(),
    }),
}));

import * as nodemailer from 'nodemailer';

describe('EmailService', () => {
    const mockSendMail = jest.fn();
    const mockVerify = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockSendMail.mockReset();
        mockVerify.mockReset();
        (nodemailer.createTransport as jest.Mock).mockReturnValue({
            sendMail: mockSendMail,
            verify: mockVerify.mockResolvedValue(true),
        });
    });

    function createService(configOverrides: Record<string, any> = {}): Promise<EmailService> {
        const defaultConfig: Record<string, any> = {
            SMTP_HOST: 'smtp.example-real.com',
            SMTP_PORT: 587,
            SMTP_USER: 'testuser',
            SMTP_PASS: 'testpass',
            SMTP_SECURE: 'false',
            SMTP_FROM: 'noreply@test.com',
            APP_URL: 'https://test.com',
            NODE_ENV: 'production',
            ...configOverrides,
        };

        return Test.createTestingModule({
            providers: [
                EmailService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const value = defaultConfig[key];
                            return value !== undefined ? value : defaultValue;
                        }),
                    },
                },
            ],
        })
            .compile()
            .then((module: TestingModule) => module.get<EmailService>(EmailService));
    }

    describe('constructor / configuration', () => {
        it('should configure transporter when valid SMTP host is provided', async () => {
            await createService();

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.example-real.com',
                    port: 587,
                    secure: false,
                    auth: { user: 'testuser', pass: 'testpass' },
                })
            );
        });

        it('should configure transporter for mailhog without auth', async () => {
            await createService({
                SMTP_HOST: 'mailhog',
                SMTP_PORT: 1025,
                SMTP_USER: undefined,
                SMTP_PASS: undefined,
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: 'mailhog',
                port: 1025,
                secure: false,
            });
        });

        it('should not configure transporter when host includes example.com', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();

            await createService({ SMTP_HOST: 'smtp.example.com' });

            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it('should not configure transporter when host is not set', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();

            await createService({ SMTP_HOST: undefined });

            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it('should configure secure transport when SMTP_SECURE is true', async () => {
            await createService({ SMTP_SECURE: 'true' });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    secure: true,
                })
            );
        });

        it('should handle SMTP connection verification failure gracefully', async () => {
            mockVerify.mockRejectedValue(new Error('Connection refused'));

            const service = await createService();

            expect(service).toBeDefined();
        });

        it('should not include auth when only SMTP_USER is provided', async () => {
            await createService({
                SMTP_USER: 'testuser',
                SMTP_PASS: undefined,
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.example-real.com',
                    auth: undefined,
                })
            );
        });

        it('should not include auth when only SMTP_PASS is provided', async () => {
            await createService({
                SMTP_USER: undefined,
                SMTP_PASS: 'testpass',
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.example-real.com',
                    auth: undefined,
                })
            );
        });

        it('should not include auth when neither SMTP_USER nor SMTP_PASS is provided', async () => {
            await createService({
                SMTP_USER: undefined,
                SMTP_PASS: undefined,
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.example-real.com',
                    auth: undefined,
                })
            );
        });

        it('should include auth when both SMTP_USER and SMTP_PASS are provided', async () => {
            await createService();

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    auth: { user: 'testuser', pass: 'testpass' },
                })
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('should send verification email successfully', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            const result = await service.sendVerificationEmail(
                'user@test.com',
                'abc123',
                'TestUser'
            );

            expect(result).toBe(true);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'noreply@test.com',
                    to: 'user@test.com',
                    subject: 'Verify your email - I Want My MTG',
                })
            );
        });

        it('should include verification URL with token in email html', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            await service.sendVerificationEmail('user@test.com', 'abc123', 'TestUser');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain('https://test.com/user/verify?token=abc123');
        });

        it('should include user name in email html', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            await service.sendVerificationEmail('user@test.com', 'abc123', 'TestUser');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain('Welcome to I Want My MTG, TestUser!');
        });

        it('should return false when sendMail throws an error', async () => {
            mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));
            const service = await createService();

            const result = await service.sendVerificationEmail(
                'user@test.com',
                'abc123',
                'TestUser'
            );

            expect(result).toBe(false);
        });

        it('should use default APP_URL when not configured', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService({ APP_URL: undefined });

            await service.sendVerificationEmail('user@test.com', 'abc123', 'TestUser');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain('http://localhost:3000/user/verify?token=abc123');
        });

        it('should use default SMTP_FROM when not configured', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService({ SMTP_FROM: undefined });

            await service.sendVerificationEmail('user@test.com', 'abc123', 'TestUser');

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'noreply@iwantmymtg.net',
                })
            );
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should send password reset email successfully', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            const result = await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            expect(result).toBe(true);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'noreply@test.com',
                    to: 'user@test.com',
                    subject: 'Reset your password - I Want My MTG',
                })
            );
        });

        it('should include reset URL with token in email html', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain(
                'https://test.com/auth/reset-password?token=reset-token-123'
            );
        });

        it('should include 1 hour expiry notice in email html', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService();

            await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain('1 hour');
        });

        it('should return false when sendMail throws an error', async () => {
            mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));
            const service = await createService();

            const result = await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            expect(result).toBe(false);
        });

        it('should use default APP_URL when not configured', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService({ APP_URL: undefined });

            await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            const sentHtml = mockSendMail.mock.calls[0][0].html;
            expect(sentHtml).toContain(
                'http://localhost:3000/auth/reset-password?token=reset-token-123'
            );
        });

        it('should use default SMTP_FROM when not configured', async () => {
            mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
            const service = await createService({ SMTP_FROM: undefined });

            await service.sendPasswordResetEmail('user@test.com', 'reset-token-123');

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'noreply@iwantmymtg.net',
                })
            );
        });
    });

    describe('sendPasswordResetEmail - unconfigured', () => {
        it('should return true in dev mode when email is not configured', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();
            const service = await createService({
                SMTP_HOST: undefined,
                NODE_ENV: 'dev',
            });

            const result = await service.sendPasswordResetEmail(
                'user@test.com',
                'reset-token-123'
            );

            expect(result).toBe(true);
            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should return false in production when email is not configured', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();
            const service = await createService({
                SMTP_HOST: undefined,
                NODE_ENV: 'production',
            });

            const result = await service.sendPasswordResetEmail(
                'user@test.com',
                'reset-token-123'
            );

            expect(result).toBe(false);
            expect(mockSendMail).not.toHaveBeenCalled();
        });
    });

    describe('sendVerificationEmail - unconfigured', () => {
        it('should return true in dev mode when email is not configured', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();
            const service = await createService({
                SMTP_HOST: undefined,
                NODE_ENV: 'dev',
            });

            const result = await service.sendVerificationEmail(
                'user@test.com',
                'abc123',
                'TestUser'
            );

            expect(result).toBe(true);
            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should return false in production when email is not configured', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();
            const service = await createService({
                SMTP_HOST: undefined,
                NODE_ENV: 'production',
            });

            const result = await service.sendVerificationEmail(
                'user@test.com',
                'abc123',
                'TestUser'
            );

            expect(result).toBe(false);
            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should return false in development mode when email is not configured', async () => {
            (nodemailer.createTransport as jest.Mock).mockClear();
            const service = await createService({
                SMTP_HOST: undefined,
                NODE_ENV: 'development',
            });

            const result = await service.sendVerificationEmail(
                'user@test.com',
                'abc123',
                'TestUser'
            );

            expect(result).toBe(false);
            expect(mockSendMail).not.toHaveBeenCalled();
        });
    });
});
