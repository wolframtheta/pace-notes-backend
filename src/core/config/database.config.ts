import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { StageEntity } from '../entities/stage.entity';
import { PaceNoteEntity } from '../entities/pace-note.entity';
import { NoteConfigEntity } from '../entities/note-config.entity';
import { RallyEntity } from '../entities/rally.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  ssl: { rejectUnauthorized: false },
  entities: [UserEntity, RallyEntity, StageEntity, PaceNoteEntity, NoteConfigEntity],
  synchronize: true,
  autoLoadEntities: true,
});
