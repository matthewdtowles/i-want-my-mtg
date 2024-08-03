import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/user/user.entity';
import { UserRepositoryPort } from './ports/user.repository.port';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRepositoryPort])],
  providers: [UserService],
  exports: [
    UserService,
    TypeOrmModule
  ]
})
export class UserModule {}
