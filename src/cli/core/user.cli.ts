import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { CreateUserDto } from "src/core/user/dto/create-user.dto";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserServicePort } from "src/core/user/ports/user.service.port";

@Injectable()
export class UserCli {

    private readonly LOGGER: Logger = new Logger(UserCli.name);

    constructor(
        @Inject(UserServicePort) private readonly service: UserServicePort
    ) { }


    @Command({
        command: 'user:create <name> <email>',
        describe: 'Create user with given name and email'
    })
    async createUser(
        @Positional({
            name: 'name',
            describe: 'user name',
            type: 'string'
        }) _name: string,
        @Positional({
            name: 'email',
            describe: 'user email',
            type: 'string'
        }) _email: string
    ): Promise<boolean> {
        const createDto: CreateUserDto = {
            name: _name,
            email: _email,
        };
        const user: UserDto = await this.service.create(createDto);
        this.LOGGER.log(`Created user: ${JSON.stringify(user)}`);
        return true;
    }

    @Command({
        command: 'user:get <email>',
        describe: 'Retrieve user with given email'
    })
    async getUser(@Positional({
        name: 'email',
        description: 'email of user to retrieve',
        type: 'string'
    }) _email: string): Promise<void> {
        const user: UserDto = await this.service.findByEmail(_email);
        this.LOGGER.log(`User: ${JSON.stringify(user)}`);
    }
}