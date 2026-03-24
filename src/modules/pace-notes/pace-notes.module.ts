import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { PaceNotesController } from './pace-notes.controller';
import { PaceNotesService } from './pace-notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaceNoteEntity])],
  controllers: [PaceNotesController],
  providers: [PaceNotesService],
})
export class PaceNotesModule {}
