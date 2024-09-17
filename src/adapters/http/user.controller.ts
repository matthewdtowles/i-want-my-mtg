import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Render } from '@nestjs/common';
import { UpdateUserDto } from 'src/core/user/dto/update-user.dto';
import { UserDto } from 'src/core/user/dto/user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';
import { CreateUserDto } from '../../core/user/dto/create-user.dto';

@Controller('user')
export class UserController {
    constructor(@Inject(UserServicePort) private readonly userService: UserServicePort) { }

    @Post('register')
    async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
        return this.userService.create(createUserDto);
    }

    @Get(':id')
    @Render('user')
    async findById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.userService.findById(id);
    }

    @Get('email/:email')
    @Render('user')
    async findByEmail(@Param('email') email: string): Promise<UserDto> {
        return this.userService.findByEmail(email);
    }

    @Patch('update')
    @Render('user')
    async update(@Body() updateUserDto: UpdateUserDto): Promise<UserDto> {
        console.log(`updateUserDto: ${JSON.stringify(updateUserDto)}`);
        return this.userService.update(updateUserDto);
    }

    // TODO: use just the ID?
    @Delete(':user')
    @Render('deleted-user') // TODO: or have logic for this in user.hbs?
    async remove(@Body('user') user: UpdateUserDto): Promise<void> {
        return this.userService.remove(user);
    }
}
