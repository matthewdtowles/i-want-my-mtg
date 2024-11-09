import { Injectable, Logger } from "@nestjs/common";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { CreateUserDto, UpdateUserDto, UserDto } from "./api/user.dto";
import { User } from "./user.entity";

@Injectable()
export class UserMapper {

    private readonly LOGGER = new Logger(UserMapper.name);

    entityToDto(user: User): UserDto {
        this.LOGGER.debug(`entityToDto`);
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
        return userDto;
    }

    dtoToEntity(userDto: UserDto): User {
        this.LOGGER.debug(`dtoToEntity`);
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        user.role = UserRole[userDto.role as keyof typeof UserRole];
        return user;
    }

    createDtoToEntity(userDto: CreateUserDto): User {
        this.LOGGER.debug(`createDtoToEntity`);
        const user: User = new User();
        user.email = userDto.email;
        user.name = userDto.name;
        user.password = userDto.password;
        return user;
    }

    // TODO: test if handles partial updates and also how to impl if not
    updateDtoToEntity(userDto: UpdateUserDto): User {
        this.LOGGER.debug(`updateDtoToEntity`);
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        user.password = userDto.password;
        return user;
    }
}
