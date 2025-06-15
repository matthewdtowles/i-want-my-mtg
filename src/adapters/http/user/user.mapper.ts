import { CreateUserDto, UpdateUserDto, UserDto } from "src/adapters/http/user/user.dto";
import { User } from "src/core/user/user.entity";
import { UserRole } from "src/shared/constants/user.role.enum";


export class UserMapper {

    static entityToDto(user: User): UserDto {
        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
    }

    static dtoToEntity(userDto: UserDto): User {
        return new User({
            id: userDto.id,
            email: userDto.email,
            name: userDto.name,
            role: UserRole[userDto.role as keyof typeof UserRole],
        });
    }

    static createDtoToEntity(userDto: CreateUserDto): User {
        return new User({
            email: userDto.email,
            name: userDto.name,
            password: userDto.password,
            role: UserRole.User,
        });
    }

    static updateDtoToEntity(userDto: UpdateUserDto): User {
        return new User({
            id: userDto.id,
            email: userDto.email,
            name: userDto.name,
        });
    }
}
