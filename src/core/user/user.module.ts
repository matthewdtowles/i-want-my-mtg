import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';
import { UserRepository } from 'src/adapters/database/user.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [
        {
            provide: UserServicePort,
            useClass: UserService,
        },
        {
            provide: UserRepositoryPort,
            useClass: UserRepository,
        }
    ],
    exports: [
        UserRepositoryPort,
        UserServicePort
    ]
})
export class UserModule { }
