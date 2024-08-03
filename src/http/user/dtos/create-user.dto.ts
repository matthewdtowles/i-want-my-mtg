import { IsEmail, IsString, IsStrongPassword, MinLength } from "class-validator";

export class CreateUserDto {
    
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    username: string;

    @IsStrongPassword()
    password: string;
}