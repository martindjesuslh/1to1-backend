import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() payload: LoginDto) {
    const result = await this._authService.login(payload);

    return {
      message: 'Login  successful',
      data: result,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() payload: RefreshTokenDto) {
    const result = await this._authService.refreshAccessToken(payload);

    return {
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() payload: RefreshTokenDto) {
    await this._authService.revokeRefreshToken(payload.refreshToken);

    return {
      message: 'Logout successful',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@GetUser('id') userId: string) {
    await this._authService.revokeAllUserTokens(userId);

    return {
      message: 'All sessions closed successfully',
    };
  }
}
