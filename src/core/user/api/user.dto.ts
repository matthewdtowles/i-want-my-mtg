import { PartialType } from "@nestjs/mapped-types";
import { IsEmail, IsEnum, IsInt, IsPositive, IsString, IsStrongPassword, MinLength } from "class-validator";
import { UserRole } from "src/adapters/http/auth/user.role";

export class UserDto {
    readonly id: number;
    readonly email: string;
    readonly name: string;

    @IsEnum(UserRole)
    readonly role: string;
}

export class CreateUserDto {
    @IsEmail()
    readonly email: string;

    @IsString()
    @MinLength(6)
    readonly name: string;

    @IsStrongPassword()
    readonly password: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsInt()
    @IsPositive()
    id: number;
}