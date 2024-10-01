import { Inject, Injectable } from '@nestjs/common';
import { InventoryMapper } from '../inventory/inventory.mapper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { User } from './user.entity';

@Injectable()
export class UserMapper {

    constructor(
        @Inject(InventoryMapper) private readonly inventoryMapper: InventoryMapper,
    ) { }

    entityToDto(user: User): UserDto {
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            inventory: this.inventoryMapper.toDtos(user.inventory),
        };
        return userDto;
    }

    dtoToEntity(userDto: UserDto): User {
        const user: User = new User();
        user.id = userDto.id;
        user.email = userDto.email;
        user.name = userDto.name;
        user.inventory = this.inventoryMapper.toEntities(userDto.inventory);
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