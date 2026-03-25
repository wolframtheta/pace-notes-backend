import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('note_groups')
export class NoteGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
