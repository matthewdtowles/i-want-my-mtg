import { IsNotEmpty, IsStrongPassword, MaxLength } from 'class-validator';

export class ResetPasswordRequestDto {
    @IsNotEmpty()
    readonly token: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsStrongPassword(
        {},
        {
            message:
                'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
        }
    )
    @MaxLength(128, { message: 'Password must be at most 128 characters' })
    readonly password: string;

    @IsNotEmpty()
    readonly confirmPassword: string;
}
