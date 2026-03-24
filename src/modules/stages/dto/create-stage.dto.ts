import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStageDto {
  @IsUUID()
  @IsNotEmpty()
  rallyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  totalDistance?: number;

  @IsObject()
  @IsOptional()
  routeGeometry?: object;

  @IsOptional()
  waypoints?: Array<{ lat: number; lng: number }>;
}
