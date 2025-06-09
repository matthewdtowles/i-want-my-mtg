import { UserRole } from "src/adapters/http/auth/auth.types";

export class User {
    id: number;
    email: string;
    name: string;
    // TODO: remove and keep inside of db module
    password: string;
    role: UserRole;
}
