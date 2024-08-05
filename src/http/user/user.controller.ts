import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UserService } from 'src/core/user/user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from 'src/core/user/user';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        // return this.userService.createUser(createUserDto);
        return null;
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
        return this.userService.findById(id);
    }

    @Get(':username')
    findByUsername(@Param('username') username: string): Promise<User> {
        return this.userService.findByUsername(username);
    }

    @Delete(':id')
    remove(@Param('id') id: number): Promise<void> {
        // this.userService.remove(id);
        return null;
    }
}
