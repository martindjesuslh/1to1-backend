import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '@modules/users/user.service';
import type { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
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
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponse> {
    const user = await this._userService.validateUser(email, password);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const accessToken = this._jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async validationToken(payload: JwtPayload) {
    const user = await this._userService.findUser({ id: payload.sub });

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }
}
