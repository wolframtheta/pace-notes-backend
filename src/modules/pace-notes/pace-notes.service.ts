import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { CreatePaceNoteDto } from './dto/create-pace-note.dto';
import { UpdatePaceNoteDto } from './dto/update-pace-note.dto';

@Injectable()
export class PaceNotesService {
  constructor(
    @InjectRepository(PaceNoteEntity)
    private readonly paceNotesRepository: Repository<PaceNoteEntity>,
  ) {}

  findByStage(stageId: string): Promise<PaceNoteEntity[]> {
    return this.paceNotesRepository.find({
      where: { stageId },
      order: { position: 'ASC' },
    });
  }

  create(dto: CreatePaceNoteDto): Promise<PaceNoteEntity> {
    const note = this.paceNotesRepository.create(dto);
    return this.paceNotesRepository.save(note);
  }

  async bulkCreate(dtos: CreatePaceNoteDto[]): Promise<PaceNoteEntity[]> {
    const notes = this.paceNotesRepository.create(dtos);
    return this.paceNotesRepository.save(notes);
  }

  async update(id: string, dto: UpdatePaceNoteDto): Promise<PaceNoteEntity> {
    const note = await this.paceNotesRepository.findOne({ where: { id } });
    if (!note) throw new NotFoundException(`PaceNote ${id} not found`);
    await this.paceNotesRepository.update(id, dto as Partial<PaceNoteEntity>);
    return this.paceNotesRepository.findOne({ where: { id } }) as Promise<PaceNoteEntity>;
  }

  async remove(id: string): Promise<void> {
    const note = await this.paceNotesRepository.findOne({ where: { id } });
    if (!note) throw new NotFoundException(`PaceNote ${id} not found`);
    await this.paceNotesRepository.delete(id);
  }

  async removeByStage(stageId: string): Promise<void> {
    await this.paceNotesRepository.delete({ stageId });
  }
}
