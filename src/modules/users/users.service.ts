import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../core/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(email: string, hashedPassword: string, name?: string): Promise<UserEntity> {
    const user = this.usersRepository.create({ email, password: hashedPassword, name });
    return this.usersRepository.save(user);
  }

  async findByRefreshTokenHash(hash: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { refreshTokenHash: hash } });
  }

  async updateRefreshToken(
    userId: string,
    hash: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshTokenHash: hash,
      refreshTokenExpiresAt: expiresAt,
    });
  }
}
