import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
    controllers: [PostController, CommentController],
    providers: [PostService, CommentService],
})
export class CommunityModule {}