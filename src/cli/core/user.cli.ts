import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { CreateUserDto, User, UserService } from "src/core/user";

@Injectable()
export class UserCli {
    private readonly LOGGER: Logger = new Logger(UserCli.name);

    constructor(@Inject(UserService) private readonly service: UserService) { }

    @Command({
        command: "user:create <name> <email> <password>",
        describe: "Create user with given name and email",
    })
    async createUser(
        @Positional({
            name: "name",
            describe: "user name",
            type: "string",
        })
        name: string,
        @Positional({
            name: "email",
            describe: "user email",
            type: "string",
        })
        email: string,
        @Positional({
            name: "password",
            describe: "user password",
            type: "string",
        })
        password: string,
    ): Promise<boolean> {
        const createDto: CreateUserDto = {
            name: name,
            email: email,
            password: password,
        };
        const user: User = await this.service.create(createDto);
        this.LOGGER.log(`Created user: ${JSON.stringify(user)}`);
        return true;
    }

    @Command({
        command: "user:get <email>",
        describe: "Retrieve user with given email",
    })
    async getUser(
        @Positional({
            name: "email",
            description: "email of user to retrieve",
            type: "string",
        })
        email: string,
    ): Promise<void> {
        const user: User = await this.service.findByEmail(email);
        this.LOGGER.log(`User: ${JSON.stringify(user)}`);
    }
}
