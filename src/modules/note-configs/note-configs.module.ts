import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteConfigEntity } from '../../core/entities/note-config.entity';
import { NoteConfigsController } from './note-configs.controller';
import { NoteConfigsService } from './note-configs.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoteConfigEntity])],
  controllers: [NoteConfigsController],
  providers: [NoteConfigsService],
})
export class NoteConfigsModule {}
