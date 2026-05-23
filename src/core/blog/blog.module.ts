import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';

@Module({
    providers: [BlogService],
    exports: [BlogService],
})
export class BlogModule {}
