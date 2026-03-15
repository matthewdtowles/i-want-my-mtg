import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordRequestDto {
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @MaxLength(255, { message: 'Email must be at most 255 characters' })
    readonly email: string;
}
