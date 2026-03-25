import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteGroupEntity } from '../../core/entities/note-group.entity';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { NoteGroupsController } from './note-groups.controller';
import { NoteGroupsService } from './note-groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoteGroupEntity, PaceNoteEntity])],
  controllers: [NoteGroupsController],
  providers: [NoteGroupsService],
  exports: [NoteGroupsService],
})
export class NoteGroupsModule {}
