import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '@entities/user.entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { FindUserParams } from '@interfaces/search.interface';

type ReturnUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<ReturnUser> {
    const { email, password, name } = createUserDto;

    const existingUser = await this._userRepository.findOne({ where: { email } });

    if (existingUser) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this._userRepository.create({
      email,
      name,
      password: hashedPassword,
    });

    const { password: _, ...userWithoutPassword } = await this._userRepository.save(user);

    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this._userRepository.findOne({
      where: { email },
    });
  }

  async findById(id: string): Promise<ReturnUser> {
    const user = await this._userRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async validateUser(email: string, password: string): Promise<ReturnUser | null> {
    const user = await this._userRepository.findOne({ where: { email } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) return null;

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}
