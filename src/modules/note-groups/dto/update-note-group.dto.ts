import { IsNumber, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateNoteGroupDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}
