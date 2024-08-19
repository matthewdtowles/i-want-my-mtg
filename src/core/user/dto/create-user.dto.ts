import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsStrongPassword, MinLength } from 'class-validator';
import { CollectionDto } from 'src/core/collection/dto/collection.dto';

export class CreateUserDto {
    
    @IsEmail()
    readonly email: string;

    @IsString()
    @MinLength(6)
    readonly name: string;

    @IsStrongPassword()
    readonly password: string;

    @IsOptional()
    @Type(() => CollectionDto)
    readonly collection: CollectionDto;
}