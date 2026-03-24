import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRallyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
