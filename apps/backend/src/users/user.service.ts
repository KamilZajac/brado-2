import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEntity } from './entities/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '@brado/types';

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
    console.log(username);

    const user = this.repo.create({ username, passwordHash: hash, role });
    console.log(user)
    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: User): Promise<User> {
    const user = await this.repo.create(data);
    console.log('enttoity')
    console.log(user)
    return this.repo.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, data);
    return this.repo.save(user);
  }

  async remove(id: number): Promise<any> {
    const user = await this.findOne(id);
    return this.repo.remove(user as any);
  }
}
