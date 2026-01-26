import { BaseViewDto } from 'src/http/base/base.view.dto';
import { UserResponseDto } from './user.response.dto';

export class UserViewDto extends BaseViewDto {
    readonly user: UserResponseDto;

    constructor(init: Partial<UserViewDto>) {
        super(init);
        this.user = init.user || new UserResponseDto();
    }
}
