import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './core/config/database.config';
import { SeederService } from './core/seeder/seeder.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StagesModule } from './modules/stages/stages.module';
import { PaceNotesModule } from './modules/pace-notes/pace-notes.module';
import { NoteConfigsModule } from './modules/note-configs/note-configs.module';
import { RalliesModule } from './modules/rallies/rallies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    RalliesModule,
    StagesModule,
    PaceNotesModule,
    NoteConfigsModule,
  ],
  providers: [SeederService],
})
export class AppModule {}
