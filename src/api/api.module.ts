import { Global, Module } from '@nestjs/common';
import { SetService } from 'src/set/set.service';

@Global()
@Module({
  providers: [
    {
      provide: 'ISetService',
      useClass: SetService,
    },
  ],
  exports: ['ISetService'],
})
export class ApiModule {}
