import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { UserResponseDto } from "src/adapters/http/user/user.response.dto";

export class UserViewDto extends BaseViewDto {
    readonly user: UserResponseDto;
}