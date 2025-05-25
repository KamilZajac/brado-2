import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';
import {User} from "../users/entities/users.entity";

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    return this.users.validateCredentials(username, password);
  }

  async login(user: User) {
    // Optional: ensure the user is up to date from DB (e.g., if passed from LocalStrategy)
    const fullUser = await this.users.findByUsername(user.username);
    if (!fullUser) {
      throw new Error('User not found after login');
    }

    const payload = {
      sub: fullUser.id,
      username: fullUser.username,
      role: fullUser.role,
    };

    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: fullUser.id,
        username: fullUser.username,
        role: fullUser.role,
      },
    };
  }
}
