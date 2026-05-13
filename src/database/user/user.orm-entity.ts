import { Exclude } from 'class-transformer';
import { UserRole } from 'src/shared/constants/user.role.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserOrmEntity {
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
        type: 'enum',
        enum: UserRole,
        enumName: 'user_role_enum',
        default: UserRole.User,
    })
    role: UserRole;

    @Column({
        name: 'included_set_types',
        type: 'text',
        array: true,
        nullable: true,
    })
    includedSetTypes: string[] | null;
}
