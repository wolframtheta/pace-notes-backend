import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteConfigDto } from './create-note-config.dto';

export class UpdateNoteConfigDto extends PartialType(CreateNoteConfigDto) {}
