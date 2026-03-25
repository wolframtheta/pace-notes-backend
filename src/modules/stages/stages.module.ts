import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageEntity } from '../../core/entities/stage.entity';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { RalliesModule } from '../rallies/rallies.module';
import { NoteGroupsModule } from '../note-groups/note-groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([StageEntity]), RalliesModule, NoteGroupsModule],
  controllers: [StagesController],
  providers: [StagesService],
})
export class StagesModule {}
