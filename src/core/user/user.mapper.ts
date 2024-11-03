import { Injectable } from "@nestjs/common";
import { UserRole } from "src/adapters/http/auth/user.role";
import { CreateUserDto, UpdateUserDto, UserDto } from "./api/user.dto";
import { User } from "./user.entity";

@Injectable()
export class UserMapper {

    entityToDto(user: User): UserDto {
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
        return userDto;
    }

    dtoToEntity(userDto: UserDto): User {
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        user.role = UserRole[userDto.role as keyof typeof UserRole];
        return user;
    }

    createDtoToEntity(userDto: CreateUserDto): User {
        const user: User = new User();
        user.email = userDto.email;
        user.name = userDto.name;
        user.password = userDto.password;
        return user;
    }

    // TODO: test if handles partial updates and also how to impl if not
    updateDtoToEntity(userDto: UpdateUserDto): User {
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        user.password = userDto.password;
        return user;
    }
}
