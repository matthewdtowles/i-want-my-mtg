import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UpdateUserDto } from 'src/core/user/dto/update-user.dto';
import { UserDto } from 'src/core/user/dto/user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';
import { CreateUserDto } from '../../core/user/dto/create-user.dto';

@Controller('users')
export class UserController {
    constructor(@Inject(UserServicePort) private readonly userService: UserServicePort) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
        return this.userService.create(createUserDto);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.userService.findById(id);
    }

    @Get(':email')
    findByEmail(@Param('email') email: string): Promise<UserDto> {
        return this.userService.findByEmail(email);
    }

    @Delete(':user')
    remove(@Body('user') user: UpdateUserDto): Promise<void> {
        return this.userService.remove(user);
    }
}
