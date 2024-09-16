import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {

    @IsEmail()
    readonly email: string;

    @IsString()
    @MinLength(6)
    readonly name: string;
}