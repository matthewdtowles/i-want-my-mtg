import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';

@Module({
    providers: [
        {
            provide: UserServicePort,
            useClass: UserService,
        },
    ],
    exports: [
        UserRepositoryPort,
        UserServicePort
    ]
})
export class UserModule { }
