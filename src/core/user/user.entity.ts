import { UserRole } from "src/core/user/user.role.enum";
import { validateInit } from "src/shared/utils";

export class User {
    readonly id: number;
    readonly email: string;
    readonly name: string;
    // TODO: remove and keep inside of db module
    readonly password: string;
    readonly role: UserRole;

    constructor(init: Partial<User>) {
        validateInit(init, ["email", "name", "role"]);
        this.id = init.id;
        this.email = init.email;
        this.name = init.name;
        this.password = init.password;
        this.role = init.role;
    }
}
