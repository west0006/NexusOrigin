// ── auth/auth.controller.ts ───────────────────────────────
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() dto: RegisterDto): ReturnType<AuthService['register']> {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginDto): ReturnType<AuthService['login']> {
        return this.authService.login(dto);
    }
}