import { Injectable } from "@nestjs/common";
import { CreateUserDto, UpdateUserDto, UserDto } from "src/adapters/http/user/user.dto";
import { UserRole } from "src/core/auth";
import { User } from "src/core/user";

@Injectable()
export class UserMapper {

    entityToDto(user: User): UserDto {
        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
    }

    dtoToEntity(userDto: UserDto): User {
        return new User({
            id: userDto.id,
            email: userDto.email,
            name: userDto.name,
            role: UserRole[userDto.role as keyof typeof UserRole],
        });
    }

    createDtoToEntity(userDto: CreateUserDto): User {
        return new User({
            email: userDto.email,
            name: userDto.name,
            password: userDto.password,
            role: UserRole.User,
        });
    }

    updateDtoToEntity(userDto: UpdateUserDto): User {
        return new User({
            id: userDto.id,
            email: userDto.email,
            name: userDto.name,
        });
    }
}
