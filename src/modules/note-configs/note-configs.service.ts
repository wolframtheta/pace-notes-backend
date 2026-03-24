import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { NoteConfigEntity } from '../../core/entities/note-config.entity';
import { CreateNoteConfigDto } from './dto/create-note-config.dto';
import { UpdateNoteConfigDto } from './dto/update-note-config.dto';

const DEFAULT_CONFIG = {
  name: 'Sistema P-T (Per defecte)',
  angleRanges: [
    { min: 0, max: 30, label: 'T-TF' },
    { min: 30, max: 40, label: 'ST+' },
    { min: 40, max: 50, label: 'ST' },
    { min: 50, max: 70, label: 'ST-' },
    { min: 70, max: 90, label: 'S' },
    { min: 90, max: 120, label: 'SP' },
    { min: 120, max: 180, label: 'P' },
  ],
  isActive: true,
};

@Injectable()
export class NoteConfigsService {
  constructor(
    @InjectRepository(NoteConfigEntity)
    private readonly noteConfigsRepository: Repository<NoteConfigEntity>,
  ) {}

  findAll(): Promise<NoteConfigEntity[]> {
    return this.noteConfigsRepository.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: CreateNoteConfigDto): Promise<NoteConfigEntity> {
    const config = this.noteConfigsRepository.create(dto);
    return this.noteConfigsRepository.save(config);
  }

  async update(id: string, dto: UpdateNoteConfigDto): Promise<NoteConfigEntity> {
    const config = await this.noteConfigsRepository.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`NoteConfig ${id} not found`);

    if (dto.isActive) {
      await this.noteConfigsRepository.update({ id: Not(id) }, { isActive: false });
    }

    await this.noteConfigsRepository.update(id, dto as Partial<NoteConfigEntity>);
    return this.noteConfigsRepository.findOne({ where: { id } }) as Promise<NoteConfigEntity>;
  }

  async remove(id: string): Promise<void> {
    const config = await this.noteConfigsRepository.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`NoteConfig ${id} not found`);
    await this.noteConfigsRepository.delete(id);
  }

  async initializeDefaults(): Promise<void> {
    const count = await this.noteConfigsRepository.count();
    if (count === 0) {
      await this.create(DEFAULT_CONFIG);
    }
  }
}
