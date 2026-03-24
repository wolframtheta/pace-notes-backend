import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { RallyEntity } from './rally.entity';

@Entity('stages')
export class StageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rally_id', type: 'uuid' })
  rallyId: string;

  @ManyToOne(() => RallyEntity, (rally) => rally.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rally_id' })
  rally: RallyEntity;

  @Column({ length: 255 })
  name: string;

  @Transform(({ value }) => (value != null ? Number(value) : null))
  @Column({ name: 'total_distance', type: 'decimal', nullable: true })
  totalDistance: number;

  @Column({ name: 'route_geometry', type: 'jsonb', nullable: true })
  routeGeometry: object;

  @Column({ type: 'jsonb', nullable: true })
  waypoints: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
