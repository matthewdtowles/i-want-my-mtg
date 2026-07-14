import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AuthService } from 'src/core/auth/auth.service';
import { EmailService } from 'src/core/email/email.service';
import { PendingUserService } from 'src/core/user/pending-user.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
import { Toast } from 'src/http/base/toast';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import {
    ADVANCED_SET_TYPES_FOR_UI,
    KnownSetType,
    PRIMARY_SET_TYPES_FOR_UI,
} from 'src/shared/constants/set-types';
import { UserRole } from 'src/shared/constants/user.role.enum';
import { CreateUserRequestDto } from './dto/create-user.request.dto';
import {
    SetTypeOption,
    SetTypePreferenceViewDto,
} from './dto/set-type-preference-view.dto';
import { UpdateUserRequestDto } from './dto/update-user.request.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { UserViewDto } from './dto/user.view.dto';
import { VerificationResultDto } from './dto/verification-result.dto';

const SET_TYPE_LABELS: Record<KnownSetType, string> = {
    expansion: 'Expansion',
    core: 'Core',
    draft_innovation: 'Draft innovation (Modern Horizons, Commander Legends, ...)',
    masters: 'Masters (reprint sets)',
    funny: 'Un-sets (silly cards)',
    commander: 'Commander decks',
    duel_deck: 'Duel decks',
    starter: 'Starter sets (Portal series)',
    from_the_vault: 'From the Vault',
    premium_deck: 'Premium decks',
    planechase: 'Planechase',
    archenemy: 'Archenemy',
    promo: 'Promo',
    box: 'Box sets (Secret Lair, etc.)',
    masterpiece: 'Masterpiece series',
    spellbook: 'Spellbook',
    arsenal: 'Arsenal',
    eternal: 'Eternal',
    memorabilia: 'Memorabilia',
    alchemy: 'Alchemy',
    token: 'Token',
};

@Injectable()
export class UserOrchestrator {
    private readonly LOGGER = getLogger(UserOrchestrator.name);

    /** Uniform signup acknowledgement — same for new, registered, and pending
     * emails so the response can't be used to enumerate accounts (B10). */
    private static readonly SIGNUP_ACK_MESSAGE =
        'Please check your email to verify your account';

    private readonly breadCrumbs = [
        { label: 'Home', url: '/' },
        { label: 'User', url: '/user' },
    ];

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(PendingUserService) private readonly pendingUserService: PendingUserService,
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(EmailService) private readonly emailService: EmailService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async initiateSignup(
        createUserDto: CreateUserRequestDto
    ): Promise<{ success: boolean; message: string }> {
        this.LOGGER.debug(`Initiating signup for email: ${createUserDto.email}.`);
        try {
            // Account enumeration defense (B10): every outcome that isn't a
            // genuine server error returns the same acknowledgement, so a caller
            // can't tell a registered/pending email from a fresh one.
            const existingUser = await this.userService.findByEmail(createUserDto.email);
            if (existingUser) {
                this.LOGGER.debug(`Signup attempted for already-registered email.`);
                return { success: true, message: UserOrchestrator.SIGNUP_ACK_MESSAGE };
            }

            // Check if there's already a pending registration
            const existingPending = await this.pendingUserService.findByEmail(createUserDto.email);
            if (existingPending && !existingPending.isExpired()) {
                this.LOGGER.debug(
                    `Pending registration already exists for ${createUserDto.email}.`
                );
                return { success: true, message: UserOrchestrator.SIGNUP_ACK_MESSAGE };
            }

            // Create pending user (handles hashing and token generation)
            const pendingUser = await this.pendingUserService.createPendingUser(
                createUserDto.email,
                createUserDto.name,
                createUserDto.password
            );

            // Send verification email
            const emailSent = await this.emailService.sendVerificationEmail(
                pendingUser.email,
                pendingUser.verificationToken,
                pendingUser.name
            );

            if (!emailSent) {
                await this.pendingUserService.deleteByEmail(createUserDto.email);
                throw new Error('Failed to send verification email');
            }

            return { success: true, message: UserOrchestrator.SIGNUP_ACK_MESSAGE };
        } catch (error) {
            this.LOGGER.debug(`Error initiating signup for email: ${createUserDto.email}.`);
            throw error;
        }
    }

    async verifyEmail(token: string): Promise<VerificationResultDto> {
        this.LOGGER.debug(`Verifying email with token.`);
        try {
            const pendingUser = await this.pendingUserService.findByToken(token);

            if (!pendingUser) {
                return new VerificationResultDto({
                    success: false,
                    message: 'Invalid or expired verification link',
                });
            }

            if (pendingUser.isExpired()) {
                await this.pendingUserService.deleteByToken(token);
                return new VerificationResultDto({
                    success: false,
                    message: 'Verification link has expired. Please sign up again.',
                });
            }

            // Check if a user with this email already exists (race condition guard)
            const existingUser = await this.userService.findByEmail(pendingUser.email);
            if (existingUser) {
                // Another request already verified this token - clean up and log the user in
                await this.pendingUserService.deleteByToken(token);
                this.LOGGER.warn(
                    `User ${pendingUser.email} already exists. Likely duplicate verification request.`
                );
                const authToken = await this.authService.login(existingUser);
                return new VerificationResultDto({
                    success: true,
                    message: 'Email verified successfully! Welcome to I Want My MTG.',
                    token: authToken.access_token,
                    user: existingUser,
                });
            }

            // Create the actual user
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
                return new VerificationResultDto({
                    success: false,
                    message: 'An error occurred during verification. Please try again.',
                });
            }

            // Delete pending user only after successful user creation
            await this.pendingUserService.deleteByToken(token);

            // Generate auth token
            const authToken = await this.authService.login(createdUser);

            return new VerificationResultDto({
                success: true,
                message: 'Email verified successfully! Welcome to I Want My MTG.',
                token: authToken.access_token,
                user: createdUser,
            });
        } catch (error) {
            this.LOGGER.error(`Error verifying email: ${error.message}`);
            return new VerificationResultDto({
                success: false,
                message: 'An error occurred during verification. Please try again.',
            });
        }
    }

    async findUser(req: AuthenticatedRequest): Promise<UserViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Find user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const user: UserResponseDto = await this.userService.findById(userId);
            const login: boolean =
                user &&
                req.query &&
                req.query.status === HttpStatus.OK.toString() &&
                req.query.action === 'login';
            this.LOGGER.debug(`User ${userId} login ${login ? 'success' : 'failed'}.`);
            return {
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                indexable: false,
                title: 'My Account - I Want My MTG',
                user,
                setTypePreference: this.buildSetTypePreferenceView(
                    user?.includedSetTypes ?? null
                ),
            };
        } catch (error) {
            this.LOGGER.debug(`Error finding user ${userId}.`);
            HttpErrorHandler.toHttpException(error, 'findUser');
        }
    }

    private buildSetTypePreferenceView(
        savedTypes: string[] | null
    ): SetTypePreferenceViewDto {
        const selected = new Set(savedTypes ?? []);
        const toOption = (value: KnownSetType): SetTypeOption => ({
            value,
            label: SET_TYPE_LABELS[value],
            selected: selected.has(value),
        });
        const advanced = ADVANCED_SET_TYPES_FOR_UI.map(toOption);
        return new SetTypePreferenceViewDto({
            usingDefault: savedTypes === null,
            primary: PRIMARY_SET_TYPES_FOR_UI.map(toOption),
            advanced,
            advancedSelectedCount: advanced.filter((o) => o.selected).length,
        });
    }

    async updateUser(
        userRequestDto: UpdateUserRequestDto,
        req: AuthenticatedRequest
    ): Promise<UserViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Updating user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (req.user.email === userRequestDto.email && req.user.name === userRequestDto.name) {
                this.LOGGER.debug(`No changes detected for user ${userId}.`);
                return new UserViewDto({
                    authenticated: req.isAuthenticated(),
                    breadcrumbs: this.breadCrumbs,
                    toast: new Toast('No changes detected', ActionStatus.INFO),
                    user: null,
                });
            }
            const updateUser: User = new User({
                id: userId,
                name: userRequestDto.name,
                email: userRequestDto.email,
            });
            const updatedUser: UserResponseDto = await this.userService.update(updateUser);
            this.LOGGER.debug(`User ${updatedUser.id} updated successfully.`);
            return new UserViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                toast: new Toast(
                    `User ${updatedUser.name} updated successfully`,
                    ActionStatus.SUCCESS
                ),
                user: updatedUser,
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating user ${userId}.`);
            HttpErrorHandler.toHttpException(error, 'findUser');
        }
    }

    async updatePassword(password: string, req: AuthenticatedRequest): Promise<BaseViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Update password for user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const coreUser: User = new User({
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role as UserRole,
            });
            const pwdUpdated: boolean = await this.userService.updatePassword(coreUser, password);
            this.LOGGER.debug(
                `Password update for user ${userId}: ${pwdUpdated ? 'success' : 'failed'}.`
            );
            return new BaseViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                toast: new Toast(
                    pwdUpdated ? 'Password updated' : 'Error updating password',
                    pwdUpdated ? ActionStatus.SUCCESS : ActionStatus.ERROR
                ),
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating password for user ${userId}.`);
            HttpErrorHandler.toHttpException(error, 'updatePassword');
        }
    }

    async deleteUser(req: AuthenticatedRequest): Promise<BaseViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Deleting user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.userService.remove(req.user.id);
            const user: UserResponseDto = await this.userService.findById(req.user.id);
            if (user && user.name) {
                this.LOGGER.debug(`Failed to delete user ${userId}.`);
                throw new Error('Could not delete user');
            }
            this.LOGGER.debug(`User ${userId} deleted successfully.`);
            return new BaseViewDto({
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                toast: new Toast('User deleted successfully', ActionStatus.SUCCESS),
            });
        } catch (error) {
            this.LOGGER.debug(`Error deleting user ${userId}.`);
            HttpErrorHandler.toHttpException(error, 'deleteUser');
        }
    }
}
