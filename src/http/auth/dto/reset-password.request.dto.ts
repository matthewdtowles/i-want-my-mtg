import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class ResetPasswordRequestDto {
    @IsNotEmpty()
    readonly token: string;

    @IsStrongPassword()
    readonly password: string;

    @IsNotEmpty()
    readonly confirmPassword: string;
}
