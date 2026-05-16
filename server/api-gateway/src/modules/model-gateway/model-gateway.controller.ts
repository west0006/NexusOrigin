import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ModelGatewayService } from './model-gateway.service';

@Controller('model-gateway')
@UseGuards(AuthGuard('jwt'))
export class ModelGatewayController {
    constructor(private readonly modelGatewayService: ModelGatewayService) {}

    @Get('providers')
    async getProviders(@Request() req: any) {
        return this.modelGatewayService.getProviders(req.user.userId);
    }

    @Post('custom')
    async addCustom(
        @Request() req: any,
        @Body() body: { name: string; baseURL: string; apiKey: string },
    ) {
        return this.modelGatewayService.addCustomProvider(
            req.user.userId,
            body.name,
            body.baseURL,
            body.apiKey,
        );
    }
}