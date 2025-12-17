import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query, BadRequestException } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';

import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetProfileQuery } from './dto/user.query';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';
import { User } from '@database/entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly _usersService: UsersService) {}

  @Get('check')
  @HttpCode(HttpStatus.OK)
  async checkUser(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const exists = await this._usersService.existingUserByEmail(email);

    return { exists };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: User) {
    return { data: user };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() payload: CreateUserDto) {
    const user = await this._usersService.create(payload);

    return { message: 'User registered successfully', data: user };
  }
}
