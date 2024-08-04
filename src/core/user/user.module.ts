import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [UserService],
  exports: [
    UserService,
    TypeOrmModule
  ]
})
export class UserModule {}
