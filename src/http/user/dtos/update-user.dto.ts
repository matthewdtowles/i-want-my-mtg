import { IsEmail, IsString, MinLength, IsStrongPassword } from 'class-validator';

export class UpdateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    username: string;

    @IsStrongPassword()
    password: string;
}