import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateUserDto } from '../../core/user/dto/create-user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';
import { User } from 'src/core/user/user.entity';

@Controller('users')
export class UserController {
    constructor(@Inject(UserServicePort) private readonly userService: UserServicePort) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return this.userService.createUser(createUserDto.name, createUserDto.email, createUserDto.password);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
        return this.userService.findById(id);
    }

    @Get(':email')
    findByEmail(@Param('email') email: string): Promise<User> {
        return this.userService.findByEmail(email);
    }

    @Delete(':user')
    remove(@Body('user') user: User): Promise<void> {
        return this.userService.remove(user);
    }
}
