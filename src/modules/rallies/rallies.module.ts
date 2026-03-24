import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RallyEntity } from '../../core/entities/rally.entity';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { RalliesController } from './rallies.controller';
import { RalliesService } from './rallies.service';

@Module({
  imports: [TypeOrmModule.forFeature([RallyEntity, PaceNoteEntity])],
  controllers: [RalliesController],
  providers: [RalliesService],
  exports: [RalliesService],
})
export class RalliesModule {}
