import {
    IsEmail,
    IsNotEmpty,
    IsString,
    IsStrongPassword,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateUserRequestDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @MaxLength(255, { message: 'Email must be at most 255 characters' })
    readonly email: string;

    @IsString()
    @IsNotEmpty({ message: 'Username is required' })
    @MinLength(6, { message: 'Username must be at least 6 characters' })
    @MaxLength(50, { message: 'Username must be at most 50 characters' })
    @Matches(/^[a-zA-Z0-9 _-]+$/, {
        message: 'Username may only contain letters, numbers, spaces, hyphens, and underscores',
    })
    readonly name: string;

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
}
