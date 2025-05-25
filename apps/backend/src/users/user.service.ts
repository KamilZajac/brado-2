import { Injectable } from '@nestjs/common';
import { UserEntity } from './entities/users.entity';
import { Repository } from 'typeorm';
import { UserRole } from '@brado/types';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { username } });
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  }

  async createUser(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<UserEntity> {
    const hash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ username, passwordHash: hash, role });
    return this.repo.save(user);
  }
}
