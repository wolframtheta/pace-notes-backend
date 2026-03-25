import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RallyEntity } from '../../core/entities/rally.entity';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { CreateRallyDto } from './dto/create-rally.dto';
import { UpdateRallyDto } from './dto/update-rally.dto';
import { NoteGroupsService } from '../note-groups/note-groups.service';

@Injectable()
export class RalliesService {
  constructor(
    @InjectRepository(RallyEntity)
    private readonly ralliesRepository: Repository<RallyEntity>,
    @InjectRepository(PaceNoteEntity)
    private readonly paceNotesRepository: Repository<PaceNoteEntity>,
    private readonly noteGroupsService: NoteGroupsService,
  ) {}

  async findAllByUser(userId: string): Promise<(RallyEntity & { stageCount: number })[]> {
    const rallies = await this.ralliesRepository.find({
      where: { userId },
      relations: ['stages'],
      order: { createdAt: 'DESC' },
    });

    return rallies.map((rally) => ({
      ...rally,
      stageCount: rally.stages?.length ?? 0,
    }));
  }

  async findOne(id: string, userId: string): Promise<RallyEntity> {
    const rally = await this.ralliesRepository.findOne({
      where: { id },
      relations: ['stages'],
    });

    if (!rally) throw new NotFoundException(`Rally ${id} not found`);
    if (rally.userId !== userId) throw new ForbiddenException();

    return rally;
  }

  async create(dto: CreateRallyDto, userId: string): Promise<RallyEntity> {
    const rally = this.ralliesRepository.create({ ...dto, userId });
    return this.ralliesRepository.save(rally);
  }

  async update(id: string, dto: UpdateRallyDto, userId: string): Promise<RallyEntity> {
    const rally = await this.findOne(id, userId);
    await this.ralliesRepository.update(rally.id, dto as Partial<RallyEntity>);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const rally = await this.findOne(id, userId);

    // Cascade delete pace notes and note groups for all stages in the rally
    for (const stage of rally.stages ?? []) {
      await this.paceNotesRepository.delete({ stageId: stage.id });
      await this.noteGroupsService.removeByStage(stage.id);
    }

    await this.ralliesRepository.delete(rally.id);
  }
}
