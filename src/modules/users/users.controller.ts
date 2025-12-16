import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetProfileQuery } from './dto/user.query';

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
  @HttpCode(HttpStatus.OK)
  async getProfile(@Query() query: GetProfileQuery) {
    if (!query.id && !query.email) throw new BadRequestException('Either id or email is required');

    const user = await this._usersService.findUser(query);

    return { data: user };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() payload: CreateUserDto) {
    const user = await this._usersService.create(payload);

    return { message: 'User registered successfully', data: user };
  }
}
