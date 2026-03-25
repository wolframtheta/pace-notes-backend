import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteGroupEntity } from '../../core/entities/note-group.entity';
import { PaceNoteEntity } from '../../core/entities/pace-note.entity';
import { CreateNoteGroupDto } from './dto/create-note-group.dto';
import { UpdateNoteGroupDto } from './dto/update-note-group.dto';

@Injectable()
export class NoteGroupsService {
  constructor(
    @InjectRepository(NoteGroupEntity)
    private readonly groupsRepository: Repository<NoteGroupEntity>,
    @InjectRepository(PaceNoteEntity)
    private readonly notesRepository: Repository<PaceNoteEntity>,
  ) {}

  findByStage(stageId: string): Promise<NoteGroupEntity[]> {
    return this.groupsRepository.find({
      where: { stageId },
      order: { position: 'ASC' },
    });
  }

  async create(dto: CreateNoteGroupDto): Promise<NoteGroupEntity> {
    const group = this.groupsRepository.create(dto);
    return this.groupsRepository.save(group);
  }

  async update(id: string, dto: UpdateNoteGroupDto): Promise<NoteGroupEntity> {
    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`NoteGroup ${id} not found`);
    await this.groupsRepository.update(id, dto);
    return this.groupsRepository.findOne({ where: { id } }) as Promise<NoteGroupEntity>;
  }

  async remove(id: string): Promise<void> {
    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`NoteGroup ${id} not found`);
    await this.notesRepository.update({ groupId: id }, { groupId: null });
    await this.groupsRepository.delete(id);
  }

  async removeByStage(stageId: string): Promise<void> {
    await this.groupsRepository.delete({ stageId });
  }
}
