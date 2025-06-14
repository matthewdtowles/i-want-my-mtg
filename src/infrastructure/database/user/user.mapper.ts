import { User } from "src/core/user/user.entity";
import { UserOrmEntity } from "src/infrastructure/database/user/user.orm-entity";

export class UserMapper {
    static toCore(ormUser: UserOrmEntity): User {
        return {
            id: ormUser.id,
            name: ormUser.name,
            email: ormUser.email,
            role: ormUser.role,
            // TODO: ??
            password: ormUser.password,
        };
    }

    static toOrmEntity(coreUser: User): UserOrmEntity {
        const ormEntity = new UserOrmEntity();
        ormEntity.id = coreUser.id;
        ormEntity.name = coreUser.name;
        ormEntity.email = coreUser.email;
        ormEntity.role = coreUser.role;
        // TODO: ???
        ormEntity.password = coreUser.password;
        return ormEntity;
    }
}