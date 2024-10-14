import { PartialType } from "@nestjs/mapped-types";
import { IsEnum, IsInt, IsPositive } from "class-validator";
import { CreateUserDto } from "./create-user.dto";
import { Transform } from "class-transformer";
import { UserRole } from "src/adapters/http/auth/user.role";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsInt()
  @IsPositive()
  id: number;

  @Transform(({ value }) => value.map((role: UserRole) => role.toString()))
  @IsEnum(UserRole, { each: true })
  roles: string[];
}
