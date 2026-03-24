import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageEntity } from '../../core/entities/stage.entity';
import { RalliesService } from '../rallies/rallies.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(StageEntity)
    private readonly stagesRepository: Repository<StageEntity>,
    private readonly ralliesService: RalliesService,
  ) {}

  async findByRally(rallyId: string, userId: string): Promise<StageEntity[]> {
    await this.ralliesService.findOne(rallyId, userId);
    return this.stagesRepository.find({
      where: { rallyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<StageEntity> {
    const stage = await this.stagesRepository.findOne({ where: { id } });
    if (!stage) throw new NotFoundException(`Stage ${id} not found`);
    return stage;
  }

  async findOneScoped(id: string, userId: string): Promise<StageEntity> {
    const stage = await this.findOne(id);
    await this.ralliesService.findOne(stage.rallyId, userId);
    return stage;
  }

  async create(dto: CreateStageDto, userId: string): Promise<StageEntity> {
    await this.ralliesService.findOne(dto.rallyId, userId);
    const stage = this.stagesRepository.create(dto);
    return this.stagesRepository.save(stage);
  }

  async update(id: string, dto: UpdateStageDto, userId: string): Promise<StageEntity> {
    const stage = await this.findOneScoped(id, userId);
    await this.stagesRepository.update(stage.id, dto as Partial<StageEntity>);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const stage = await this.findOneScoped(id, userId);
    await this.stagesRepository.delete(stage.id);
  }
}
