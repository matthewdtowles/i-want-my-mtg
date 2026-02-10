import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AuthService } from 'src/core/auth/auth.service';
import { AuthToken } from 'src/core/auth/auth.types';
import { EmailService } from 'src/core/email/email.service';
import { PasswordResetService } from 'src/core/password-reset/password-reset.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { UserResponseDto } from 'src/http/user/dto/user.response.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { UserRole } from 'src/shared/constants/user.role.enum';
import { AuthResult } from './dto/auth.result';
import { ResetPasswordResultDto } from './dto/reset-password-result.dto';

@Injectable()
export class AuthOrchestrator {
    private readonly LOGGER = getLogger(AuthOrchestrator.name);

    constructor(
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(PasswordResetService) private readonly passwordResetService: PasswordResetService,
        @Inject(UserService) private readonly userService: UserService,
        @Inject(EmailService) private readonly emailService: EmailService
    ) {}

    async login(user: UserResponseDto): Promise<AuthResult> {
        try {
            this.LOGGER.debug(`Processing login for user ${user?.name}.`);
            if (!user || !user.id) {
                throw new Error('User not found or invalid.');
            }
            const coreUser: User = new User({
                id: user.id,
                email: user.email,
                name: user.name,
                role: UserRole[user.role as keyof typeof UserRole] || UserRole.User,
            });
            const authToken: AuthToken = await this.authService.login(coreUser);
            if (!authToken || !authToken.access_token) {
                throw new Error('Authentication token generation failed.');
            }
            this.LOGGER.debug(`Login successful for user ${user.id}.`);
            return new AuthResult({
                success: true,
                token: authToken.access_token,
                redirectTo: `/user?action=login&status=${HttpStatus.OK}`,
                statusCode: HttpStatus.OK,
                user: coreUser,
            });
        } catch (error) {
            this.LOGGER.error(`Login error: ${error.message}.`);
            return new AuthResult({
                success: false,
                redirectTo: `/login?action=login&status=${HttpStatus.UNAUTHORIZED}&message=Authentication%20failed`,
                statusCode: HttpStatus.UNAUTHORIZED,
                error: error.message,
            });
        }
    }

    async logout(): Promise<AuthResult> {
        try {
            this.LOGGER.debug(`Processing logout.`);
            return new AuthResult({
                success: true,
                redirectTo: `/?action=logout&status=${HttpStatus.OK}&message=Logged%20out`,
                statusCode: HttpStatus.OK,
            });
        } catch (error) {
            this.LOGGER.error(`Logout error: ${error.message}.`);
            return new AuthResult({
                success: false,
                redirectTo: `/?action=logout&status=${HttpStatus.INTERNAL_SERVER_ERROR}&message=Logout%20failed`,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message,
            });
        }
    }

    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
        const successMessage = 'If an account with that email exists, we have sent a password reset link.';
        try {
            this.LOGGER.debug(`Processing password reset request for email: ${email}.`);
            const user = await this.userService.findByEmail(email);
            if (!user) {
                this.LOGGER.debug(`No user found for email: ${email}. Returning success to prevent enumeration.`);
                return { success: true, message: successMessage };
            }

            const resetRequest = await this.passwordResetService.createResetRequest(email);
            const emailSent = await this.emailService.sendPasswordResetEmail(
                email,
                resetRequest.resetToken
            );

            if (!emailSent) {
                await this.passwordResetService.deleteByToken(resetRequest.resetToken);
                this.LOGGER.error(`Failed to send password reset email to ${email}.`);
            }

            return { success: true, message: successMessage };
        } catch (error) {
            this.LOGGER.error(`Error processing password reset request: ${error.message}.`);
            return { success: true, message: successMessage };
        }
    }

    async resetPassword(token: string, password: string): Promise<ResetPasswordResultDto> {
        try {
            this.LOGGER.debug(`Processing password reset with token.`);
            const resetRequest = await this.passwordResetService.findByToken(token);

            if (!resetRequest) {
                return new ResetPasswordResultDto({
                    success: false,
                    message: 'Invalid or expired reset link. Please request a new one.',
                });
            }

            if (resetRequest.isExpired()) {
                await this.passwordResetService.deleteByToken(token);
                return new ResetPasswordResultDto({
                    success: false,
                    message: 'This reset link has expired. Please request a new one.',
                });
            }

            const user = await this.userService.findByEmail(resetRequest.email);
            if (!user) {
                await this.passwordResetService.deleteByToken(token);
                return new ResetPasswordResultDto({
                    success: false,
                    message: 'Unable to reset password. Please try again.',
                });
            }

            await this.userService.updatePassword(user, password);
            await this.passwordResetService.deleteByToken(token);

            const authToken: AuthToken = await this.authService.login(user);

            return new ResetPasswordResultDto({
                success: true,
                message: 'Your password has been reset successfully.',
                token: authToken.access_token,
                user,
            });
        } catch (error) {
            this.LOGGER.error(`Error resetting password: ${error.message}.`);
            return new ResetPasswordResultDto({
                success: false,
                message: 'An error occurred while resetting your password. Please try again.',
            });
        }
    }
}
