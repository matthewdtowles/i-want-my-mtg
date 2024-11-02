import { IsEnum } from "class-validator";
import { UserRole } from "src/adapters/http/auth/user.role";

export class UserDto {
    readonly id: number;
    readonly email: string;
    readonly name: string;

    @IsEnum(UserRole)
    readonly role: string;
}
