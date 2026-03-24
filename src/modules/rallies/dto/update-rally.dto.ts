import { PartialType } from '@nestjs/mapped-types';
import { CreateRallyDto } from './create-rally.dto';

export class UpdateRallyDto extends PartialType(CreateRallyDto) {}
