import { Exclude } from "class-transformer";
import { UserRole } from "src/adapters/http/auth/user.role";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
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

    @Column({ default: UserRole.User.toString() })
    role: string;
}
