import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordRequestDto {
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please provide a valid email address' })
    readonly email: string;
}
