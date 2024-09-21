import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Redirect, Render } from '@nestjs/common';
import { UpdateUserDto } from 'src/core/user/dto/update-user.dto';
import { UserDto } from 'src/core/user/dto/user.dto';
import { UserServicePort } from 'src/core/user/ports/user.service.port';
import { CreateUserDto } from '../../core/user/dto/create-user.dto';

@Controller('user')
export class UserController {
    constructor(@Inject(UserServicePort) private readonly userService: UserServicePort) { }

    @Get('create')
    @Render('create-user')
    createForm() {
        return {};
    }

    @Post('create')
    @Redirect()
    async create(@Body() createUserDto: CreateUserDto) {
        const createdUser: UserDto = await this.userService.create(createUserDto);
        return { url: `/user/${createdUser.id}` };
    }

    @Get(':id')
    @Render('user')
    async findById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
        return await this.userService.findById(id);
    }

    @Patch('update')
    @Render('user')
    async update(@Body() updateUserDto: UpdateUserDto): Promise<UserDto> {
        return await this.userService.update(updateUserDto);
    }

    @Delete('delete')
    @Render('delete-user')
    async remove(@Body() user: UpdateUserDto) {
        const limit: number = 3;
        let i = 0;
        do {
            i++;
            await this.userService.remove(user);
        } while(await this.userService.findById(user.id) && i < limit);
        const msgPrefix: string = `User ${user.name}`;
        const successMsg: string = `${msgPrefix} has been successfully removed.`;
        const failMsg: string = `${msgPrefix} could not be removed.`;
        return {
            message: i < limit ? successMsg : failMsg 
        };
    }

    /*
     async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response
  ): Promise<void> {
    await this.userService.update(+id, updateUserDto);

    // Render another page and pass the message as part of the response body
    res.render('user-details', {
      userId: id,
      message: 'User updated successfully',
    });*/
}
