import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, hashed, dto.name);

    return this.issueTokensForUser(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokensForUser(user.id, user.email, user.name);
  }

  async refresh(refreshToken: string) {
    const hash = this.hashRefreshToken(refreshToken);
    const user = await this.usersService.findByRefreshTokenHash(hash);
    if (!user?.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (user.refreshTokenExpiresAt < new Date()) {
      await this.usersService.updateRefreshToken(user.id, null, null);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { plainToken, hash: newHash, expiresAt } = this.createRefreshToken();
    await this.usersService.updateRefreshToken(user.id, newHash, expiresAt);

    const access_token = this.generateAccessToken(user.id, user.email);
    return {
      access_token,
      refresh_token: plainToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null, null);
  }

  private async issueTokensForUser(
    userId: string,
    email: string,
    name: string | null | undefined,
  ) {
    const { plainToken, hash, expiresAt } = this.createRefreshToken();
    await this.usersService.updateRefreshToken(userId, hash, expiresAt);

    const access_token = this.generateAccessToken(userId, email);
    return {
      access_token,
      refresh_token: plainToken,
      user: { id: userId, email, name },
    };
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  private createRefreshToken(): {
    plainToken: string;
    hash: string;
    expiresAt: Date;
  } {
    const plainToken = randomBytes(32).toString('hex');
    const hash = this.hashRefreshToken(plainToken);
    const days = Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS', '7'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(days) ? days : 7));
    return { plainToken, hash, expiresAt };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
