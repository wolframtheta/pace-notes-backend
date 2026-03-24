import { IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AngleRangeDto {
  min: number;
  max: number;
  label: string;
}

export class CreateNoteConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AngleRangeDto)
  angleRanges: AngleRangeDto[];

  @IsBoolean()
  isActive: boolean;
}
