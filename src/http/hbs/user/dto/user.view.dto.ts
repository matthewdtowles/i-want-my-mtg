import { BaseViewDto } from 'src/http/base/base.view.dto';
import { SetTypePreferenceViewDto } from './set-type-preference-view.dto';
import { UserResponseDto } from './user.response.dto';

export class UserViewDto extends BaseViewDto {
    readonly user: UserResponseDto;
    readonly welcome?: boolean;
    readonly setTypePreference?: SetTypePreferenceViewDto;

    constructor(init: Partial<UserViewDto>) {
        super(init);
        this.user = init.user || new UserResponseDto();
        this.welcome = init.welcome;
        this.setTypePreference = init.setTypePreference;
    }
}
