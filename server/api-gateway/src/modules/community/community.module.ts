import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
// 如有 CommentController 和 CommentService 也一并引入

@Module({
    controllers: [PostController],
    providers: [PostService],
})
export class CommunityModule {}