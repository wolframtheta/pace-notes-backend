import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageEntity } from '../../core/entities/stage.entity';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { RalliesModule } from '../rallies/rallies.module';

@Module({
  imports: [TypeOrmModule.forFeature([StageEntity]), RalliesModule],
  controllers: [StagesController],
  providers: [StagesService],
})
export class StagesModule {}
