import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from 'src/core/user/user';
import { UserServicePort } from 'src/core/user/ports/user.service.port';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserServicePort) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        // return this.userService.createUser(createUserDto);
        return null;
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
        return this.userService.findById(id);
    }

    @Get(':email')
    findByEmail(@Param('email') email: string): Promise<User> {
        return this.userService.findByEmail(email);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        // this.userService.remove(id);
        return null;
    }
}
