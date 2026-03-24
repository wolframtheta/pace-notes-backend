import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    const email = 'admin@scrum-app.com';
    const existing = await this.usersService.findByEmail(email);

    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return;
    }

    const hashed = await bcrypt.hash('admin1234', 10);
    await this.usersService.create(email, hashed, 'Admin');
    this.logger.log(`Default admin user created: ${email}`);
  }
}
