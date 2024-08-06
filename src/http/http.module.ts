import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';

@Module({
    imports: [
        CoreModule
    ],
    exports: [
        CoreModule
    ],
})
export class HttpModule {}
