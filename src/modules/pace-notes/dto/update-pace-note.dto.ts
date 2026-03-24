import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePaceNoteDto } from './create-pace-note.dto';

export class UpdatePaceNoteDto extends PartialType(
  OmitType(CreatePaceNoteDto, ['stageId'] as const),
) {}
