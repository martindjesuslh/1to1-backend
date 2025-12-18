import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';

import { UsersService } from '@modules/users/user.service';
import { RefreshToken } from '@database/entities/refresh-token.entity';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UsersService,
    private readonly _jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly _refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponse> {
    const user = await this._userService.validateUser(email, password);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this._jwtService.sign(payload);

    const refreshToken = await this._generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private async _generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const refreshToken = this._refreshTokenRepository.create({
      token: hashedToken,
      userId,
      expiresAt,
      isRevoked: false,
    });

    await this._refreshTokenRepository.save(refreshToken);

    return token;
  }

  async refreshAccessToken({ refreshToken }: RefreshTokenDto): Promise<Omit<LoginResponse, 'user'>> {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this._refreshTokenRepository.findOne({
      where: { token: hashedToken },
      relations: ['user'],
    });

    if (!storedToken) throw new UnauthorizedException('Invalid refresh token');

    if (storedToken.isRevoked) throw new UnauthorizedException('Refresh token has been revoked');

    if (new Date() > storedToken.expiresAt) {
      await this._refreshTokenRepository.remove(storedToken);
      throw new UnauthorizedException('Refresh token has expired');
    }

    const payload: JwtPayload = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
    };

    const accessToken = this._jwtService.sign(payload);

    const newRefreshToken = await this._generateRefreshToken(storedToken.user.id);

    storedToken.isRevoked = true;
    await this._refreshTokenRepository.save(storedToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this._refreshTokenRepository.findOne({
      where: { token: hashedToken },
    });

    if (!storedToken) {
      throw new NotFoundException('Refresh token not found');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token already revoked');
    }

    storedToken.isRevoked = true;
    await this._refreshTokenRepository.save(storedToken);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this._refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async cleanExpiredTokens(): Promise<void> {
    await this._refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async validateToken(payload: JwtPayload) {
    const user = await this._userService.findById(payload.sub);

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }

  async cleanOldRevokedTokens(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this._refreshTokenRepository.delete({
      isRevoked: true,
      createdAt: LessThan(cutoffDate),
    });

    console.log(`Cleaned ${result.affected || 0} old revoked tokens (older than ${daysOld} days)`);
  }
}
