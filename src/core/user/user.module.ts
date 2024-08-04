import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserServicePort } from './ports/user.service.port';
import { UserRepository } from 'src/database/user/user.repository';

@Module({
    providers: [
        {
            provide: UserServicePort,
            useClass: UserService,
        },
        {
            provide: 'UserRepositoryPort',
            useClass: UserRepository,
        },
    ],
    exports: [UserServicePort]
})
export class UserModule { }
