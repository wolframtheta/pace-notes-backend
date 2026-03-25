import { IsNumber, IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateNoteGroupDto {
  @IsUUID()
  stageId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  position: number;
}
