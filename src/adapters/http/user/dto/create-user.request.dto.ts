import { IsEmail, IsString, IsStrongPassword, MinLength } from "class-validator";

export class CreateUserRequestDto {
    @IsEmail()
    readonly email: string;

    @IsString()
    @MinLength(6)
    readonly name: string;

    @IsStrongPassword()
    readonly password: string;
}