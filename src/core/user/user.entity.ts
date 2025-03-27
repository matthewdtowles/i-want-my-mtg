import { Exclude } from "class-transformer";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users" })
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column()
    @Exclude()
    password: string;

    @Column({
        type: "enum",
        enum: UserRole,
        enumName: "user_role_enum",
        default: UserRole.User,
    })
    role: UserRole;
}
