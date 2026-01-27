import { User } from 'src/core/user/user.entity';
import { UserRole } from 'src/shared/constants/user.role.enum';
import { UserOrmEntity } from './user.orm-entity';

export class UserMapper {
    static toCore(ormUser: UserOrmEntity): User {
        const user: User = new User({
            id: ormUser.id,
            name: ormUser.name,
            email: ormUser.email,
            role: ormUser.role ?? UserRole.User,
            password: ormUser.password,
        });
        return user;
    }

    static toOrmEntity(coreUser: User): UserOrmEntity {
        const ormEntity = new UserOrmEntity();
        ormEntity.id = coreUser.id;
        ormEntity.name = coreUser.name;
        ormEntity.email = coreUser.email;
        ormEntity.role = coreUser.role ?? UserRole.User;
        ormEntity.password = coreUser.password;
        return ormEntity;
    }
}
