import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/SearchQuery.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get()
    @ApiOperation({ summary: '全局搜索', description: '搜索帖子、能力、Agent、设置项' })
    @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
    @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
    async search(@Query() query: SearchQueryDto) {
        const q = query.q || '';
        const limit = query.limit || 10;
        return this.searchService.search(q, limit);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('personal')
    @ApiBearerAuth()
    @ApiOperation({ summary: '个人内容搜索', description: '搜索当前用户自己的内容（帖子、购买的能力、Agent等）' })
    async searchPersonal(@Query() query: SearchQueryDto, @Request() req: any) {
        const q = query.q || '';
        const limit = query.limit || 10;
        // 这里可以扩展搜索用户自己的内容
        // MVP 版本先复用通用搜索，后续可按需扩展
        return this.searchService.search(q, limit);
    }
}