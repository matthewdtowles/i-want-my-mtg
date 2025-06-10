import { UserRole } from "src/adapters/http/auth/auth.types";

export class User {
    readonly id: number;
    readonly email: string;
    readonly name: string;
    // TODO: remove and keep inside of db module
    readonly password: string;
    readonly role: UserRole;
}
