import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';

@Entity('pace_notes')
export class PaceNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @Column({ type: 'int' })
  position: number;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 10, nullable: true })
  direction: string;

  @Transform(({ value }) => (value != null ? Number(value) : null))
  @Column({ type: 'decimal', nullable: true })
  angle: number;

  @Transform(({ value }) => (value != null ? Number(value) : null))
  @Column({ type: 'decimal', nullable: true })
  distance: number;

  @Column({ name: 'note_label', length: 50, nullable: true })
  noteLabel: string;

  @Column({ name: 'custom_text', type: 'text', nullable: true })
  customText: string;

  @Column({ name: 'note_before', type: 'text', nullable: true })
  noteBefore: string;

  @Column({ name: 'note_after', type: 'text', nullable: true })
  noteAfter: string;

  @Column({ name: 'note_before_size', type: 'int', nullable: true })
  noteBeforeSize: number;

  @Column({ name: 'note_after_size', type: 'int', nullable: true })
  noteAfterSize: number;

  @Column({ name: 'note_position', type: 'int', nullable: true })
  notePosition: number;

  @Column({ name: 'note_gap_left', type: 'int', nullable: true })
  noteGapLeft: number;

  @Column({ name: 'note_gap_right', type: 'int', nullable: true })
  noteGapRight: number;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ name: 'page_break_after', type: 'boolean', default: false })
  pageBreakAfter: boolean;

  @Transform(({ value }) => Number(value))
  @Column({ type: 'decimal' })
  lat: number;

  @Transform(({ value }) => Number(value))
  @Column({ type: 'decimal' })
  lng: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
