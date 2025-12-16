import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
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

  async findUser(params: FindUserParams): Promise<ReturnUser> {
    const where = {};
    for (const key in params) if (params[key]) where[key] = params[key];

    if (!Object.keys(where)) throw new Error('AL menos un campo debe ser provisto en la búsqueda');

    const user = await this._userRepository.findOne({ where });

    if (!user) throw new ConflictException('El usuario no existe');

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async existingUserByEmail(email: string): Promise<boolean> {
    const exists = await this.findUser({ email });

    return Boolean(exists);
  }

  async create(createUserDto: CreateUserDto): Promise<ReturnUser> {
    const { email, password, name } = createUserDto;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = this._userRepository.create({
        email,
        name,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = await this._userRepository.save(user);

      return userWithoutPassword;
    } catch (err) {
      throw new InternalServerErrorException('Error al crear usuario', err.message);
    }
  }
}
