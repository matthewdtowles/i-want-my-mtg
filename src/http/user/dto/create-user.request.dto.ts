import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class CreateUserRequestDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty()
    readonly email: string;

    @IsString()
    @MinLength(6)
    readonly name: string;

    @IsStrongPassword()
    readonly password: string;
}
