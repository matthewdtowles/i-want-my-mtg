import {
  IsEmail,
  IsEnum,
  IsString,
  IsStrongPassword,
  MinLength,
} from "class-validator";
import { UserRole } from "src/adapters/http/auth/user.role";

export class CreateUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(6)
  readonly name: string;

  @IsStrongPassword()
  readonly password: string;

  @IsEnum(UserRole)
  readonly role: string;
}
