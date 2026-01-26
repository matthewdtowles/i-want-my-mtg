import { IsEmail, IsString } from 'class-validator';

export class UpdateUserRequestDto {
    @IsString() readonly name: string;
    @IsEmail() readonly email: string;
}
