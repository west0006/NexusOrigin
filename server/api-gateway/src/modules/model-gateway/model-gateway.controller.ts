// server/api-gateway/src/modules/model-gateway/model-gateway.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ModelGatewayService } from './model-gateway.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {TestConnectionDto} from "./dto/TestConnection.dto";

@ApiTags('Model Gateway')
@Controller('model-gateway')
export class ModelGatewayController {
    constructor(private modelGatewayService: ModelGatewayService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('providers')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取用户的所有模型提供商' })
    async listProviders(@Request() req: any) {
        return this.modelGatewayService.getProviders(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('providers')
    @ApiBearerAuth()
    @ApiOperation({ summary: '添加模型提供商' })
    async addProvider(
        @Body('providerName') providerName: string,
        @Body('apiKey') apiKey: string,
        @Body('baseUrl') baseUrl?: string,
        @Body('isDefault') isDefault?: boolean,
        @Request() req?: any,
    ) {
        return this.modelGatewayService.addCustomProvider(
            req!.user.userId, providerName, apiKey, baseUrl, isDefault,
        );
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('providers/:id/default')
    @ApiBearerAuth()
    @ApiOperation({ summary: '设为默认提供商' })
    async setDefaultProvider(@Param('id') id: string, @Request() req: any) {
        return this.modelGatewayService.setDefaultProvider(req.user.userId, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('providers/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '删除模型提供商' })
    async deleteProvider(@Param('id') id: string, @Request() req: any) {
        return this.modelGatewayService.deleteProvider(req.user.userId, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('providers/:id/test')
    @ApiBearerAuth()
    @ApiOperation({ summary: '测试已保存的提供商连接' })
    async testProvider(@Param('id') id: string, @Request() req: any) {
        return this.modelGatewayService.testProviderConnection(req.user.userId, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('providers/:id/models')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取已保存提供商的模型列表' })
    async getModels(@Param('id') id: string, @Request() req: any) {
        return this.modelGatewayService.getProviderModels(req.user.userId, id);
    }

    @Post('test-connection')
    @ApiOperation({ summary: '测试未保存的连接（无认证）' })
    async testConnection(@Body() dto: TestConnectionDto) {
        return this.modelGatewayService.testConnectionWithCredentials(dto.baseURL, dto.apiKey);
    }
}