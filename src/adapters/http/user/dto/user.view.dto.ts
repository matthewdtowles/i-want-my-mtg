import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { UserResponseDto } from "./user.response.dto";

export class UserViewDto extends BaseViewDto {
    readonly user: UserResponseDto;

    constructor(init: Partial<UserViewDto>) {
        super(init);
        this.user = init.user || new UserResponseDto();
    }
}