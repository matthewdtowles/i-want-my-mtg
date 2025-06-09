import { Injectable, Logger } from "@nestjs/common";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { CreateUserDto, UpdateUserDto, UserDto } from "./user.dto";
import { User } from "./user.entity";

@Injectable()
export class UserMapper {
    private readonly LOGGER = new Logger(UserMapper.name);

    entityToDto(user: User): UserDto {
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
        this.LOGGER.debug(`entityToDto userDto ${JSON.stringify(userDto)}`);
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

    updateDtoToEntity(userDto: UpdateUserDto): User {
        this.LOGGER.debug(`updateDtoToEntity`);
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        this.LOGGER.debug(`updateDtoToEntity user ${JSON.stringify(user)}`);
        return user;
    }
}
