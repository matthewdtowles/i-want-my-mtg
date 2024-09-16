import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post, Render } from '@nestjs/common';
import { UpdateUserDto } from 'src/core/user/dto/update-user.dto';
import { UserDto } from 'src/core/user/dto/user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';
import { CreateUserDto } from '../../core/user/dto/create-user.dto';

@Controller('user')
export class UserController {
    constructor(@Inject(UserServicePort) private readonly userService: UserServicePort) {}

    @Post('register')
    create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
        return this.userService.create(createUserDto);
    }

    @Get(':id')
    @Render('user')
    findById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return this.userService.findById(id);
    }

    @Get('email/:email')
    @Render('user')
    findByEmail(@Param('email') email: string): Promise<UserDto> {
        return this.userService.findByEmail(email);
    }

    @Post('update')
    @Render('user')
    update(@Body() updateUserDto: UpdateUserDto): Promise<UserDto> {
        return this.userService.update(updateUserDto);
    }

    @Delete(':user')
    @Render('deleted-user') // TODO: or have logic for this in user.hbs?
    remove(@Body('user') user: UpdateUserDto): Promise<void> {
        return this.userService.remove(user);
    }
}
