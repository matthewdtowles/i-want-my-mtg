import { Inject, Injectable } from '@nestjs/common';
import { EmailService } from 'src/core/email/email.service';
import { getLogger } from 'src/logger/global-app-logger';
import { UserRole } from 'src/shared/constants/user.role.enum';
import { PendingUserService } from './pending-user.service';
import { User } from './user.entity';
import { UserService } from './user.service';

/**
 * The result of consuming a verification token. `user` is present only on
 * success; callers issue their own session (a web cookie, or mobile
 * access+refresh tokens) from it — this core service is transport-agnostic.
 */
export interface VerifyEmailResult {
    success: boolean;
    message: string;
    user?: User;
}

/**
 * Transport-agnostic signup + email-verification orchestration. Shared by the
 * server-rendered web flow (UserOrchestrator) and the JSON API (AuthApiController)
 * so the account-enumeration defense (B10) and verification race-condition guard
 * live in exactly one place.
 */
@Injectable()
export class SignupService {
    private readonly LOGGER = getLogger(SignupService.name);

    /** Uniform signup acknowledgement — same for new, registered, and pending
     * emails so the response can't be used to enumerate accounts (B10). */
    static readonly SIGNUP_ACK_MESSAGE = 'Please check your email to verify your account';

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(PendingUserService) private readonly pendingUserService: PendingUserService,
        @Inject(EmailService) private readonly emailService: EmailService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    /**
     * Stage a pending registration and email a verification link. Returns
     * normally for every non-error outcome (new / already-registered / already-
     * pending) so callers can respond with a uniform acknowledgement and a
     * caller cannot tell a registered email from a fresh one (B10). Throws only
     * on a genuine server error (e.g. the verification email fails to send).
     */
    async initiateSignup(email: string, name: string, password: string): Promise<void> {
        this.LOGGER.debug(`Initiating signup for email: ${email}.`);

        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            this.LOGGER.debug(`Signup attempted for already-registered email.`);
            return;
        }

        const existingPending = await this.pendingUserService.findByEmail(email);
        if (existingPending && !existingPending.isExpired()) {
            this.LOGGER.debug(`Pending registration already exists for ${email}.`);
            return;
        }

        // Create pending user (handles hashing and token generation).
        const pendingUser = await this.pendingUserService.createPendingUser(email, name, password);

        const emailSent = await this.emailService.sendVerificationEmail(
            pendingUser.email,
            pendingUser.verificationToken,
            pendingUser.name
        );

        if (!emailSent) {
            await this.pendingUserService.deleteByEmail(email);
            throw new Error('Failed to send verification email');
        }
    }

    /**
     * Consume a verification token: promote the pending user to a real user
     * (idempotently — a duplicate request for an already-verified token still
     * succeeds) and hand the created/verified user back to the caller.
     */
    async verifyEmail(token: string): Promise<VerifyEmailResult> {
        this.LOGGER.debug(`Verifying email with token.`);
        try {
            const pendingUser = await this.pendingUserService.findByToken(token);

            if (!pendingUser) {
                return { success: false, message: 'Invalid or expired verification link' };
            }

            if (pendingUser.isExpired()) {
                await this.pendingUserService.deleteByToken(token);
                return {
                    success: false,
                    message: 'Verification link has expired. Please sign up again.',
                };
            }

            // Race-condition guard: another request may have already verified
            // this token. Treat it as success and return the existing user.
            const existingUser = await this.userService.findByEmail(pendingUser.email);
            if (existingUser) {
                await this.pendingUserService.deleteByToken(token);
                this.LOGGER.warn(
                    `User ${pendingUser.email} already exists. Likely duplicate verification request.`
                );
                return {
                    success: true,
                    message: 'Email verified successfully! Welcome to I Want My MTG.',
                    user: existingUser,
                };
            }

            const user = new User({
                email: pendingUser.email,
                name: pendingUser.name,
                password: pendingUser.passwordHash, // Already hashed
                role: UserRole.User,
            });

            const createdUser = await this.userService.createWithHashedPassword(user);

            if (!createdUser) {
                this.LOGGER.error(
                    `Failed to create user for ${pendingUser.email}. Pending user preserved for retry.`
                );
                return {
                    success: false,
                    message: 'An error occurred during verification. Please try again.',
                };
            }

            // Delete pending user only after successful user creation.
            await this.pendingUserService.deleteByToken(token);

            return {
                success: true,
                message: 'Email verified successfully! Welcome to I Want My MTG.',
                user: createdUser,
            };
        } catch (error) {
            this.LOGGER.error(`Error verifying email: ${error.message}`);
            return {
                success: false,
                message: 'An error occurred during verification. Please try again.',
            };
        }
    }
}
