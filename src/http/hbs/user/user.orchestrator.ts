import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AuthService } from 'src/core/auth/auth.service';
import { SignupService } from 'src/core/user/signup.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
import { isAuthenticated } from 'src/http/base/http.util';
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

    private readonly breadCrumbs = [
        { label: 'Home', url: '/' },
        { label: 'User', url: '/user' },
    ];

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(SignupService) private readonly signupService: SignupService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async initiateSignup(
        createUserDto: CreateUserRequestDto
    ): Promise<{ success: boolean; message: string }> {
        await this.signupService.initiateSignup(
            createUserDto.email,
            createUserDto.name,
            createUserDto.password
        );
        return { success: true, message: SignupService.SIGNUP_ACK_MESSAGE };
    }

    async verifyEmail(token: string): Promise<VerificationResultDto> {
        const result = await this.signupService.verifyEmail(token);
        if (!result.success || !result.user) {
            return new VerificationResultDto({ success: false, message: result.message });
        }
        // Issue the web session cookie token from the verified user. The email
        // is already verified at this point, so a token-issuance failure must
        // surface as a consistent verification error page, not a generic 500.
        try {
            const authToken = await this.authService.login(result.user);
            return new VerificationResultDto({
                success: true,
                message: result.message,
                token: authToken.access_token,
                user: result.user,
            });
        } catch (error) {
            this.LOGGER.error(`Failed to issue session after verifying ${result.user.email}: ${error}.`);
            return new VerificationResultDto({
                success: false,
                message: 'Your email was verified, but we could not sign you in. Please log in.',
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
                authenticated: isAuthenticated(req),
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
                    authenticated: isAuthenticated(req),
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
                authenticated: isAuthenticated(req),
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
                authenticated: isAuthenticated(req),
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
