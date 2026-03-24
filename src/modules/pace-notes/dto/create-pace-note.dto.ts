import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export type PaceNoteType = 'curve' | 'straight';
export type PaceNoteDirection = 'left' | 'right';

export class CreatePaceNoteDto {
  @IsUUID()
  stageId: string;

  @IsNumber()
  position: number;

  @IsEnum(['curve', 'straight'])
  type: PaceNoteType;

  @IsEnum(['left', 'right'])
  @IsOptional()
  direction?: PaceNoteDirection;

  @IsNumber()
  @IsOptional()
  angle?: number;

  @IsNumber()
  @IsOptional()
  distance?: number;

  @IsString()
  @IsOptional()
  noteLabel?: string;

  @IsString()
  @IsOptional()
  customText?: string;

  @IsString()
  @IsOptional()
  noteBefore?: string;

  @IsString()
  @IsOptional()
  noteAfter?: string;

  @IsNumber()
  @IsOptional()
  noteBeforeSize?: number;

  @IsNumber()
  @IsOptional()
  noteAfterSize?: number;

  @IsNumber()
  @IsOptional()
  notePosition?: number;

  @IsNumber()
  @IsOptional()
  noteGapLeft?: number;

  @IsNumber()
  @IsOptional()
  noteGapRight?: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
