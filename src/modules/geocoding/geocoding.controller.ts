import { Controller, Get, Query } from '@nestjs/common';
import { GeocodingService, RoadPointResult } from './geocoding.service';

@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('road-point')
  roadPoint(
    @Query('ref') ref: string,
    @Query('km') km?: string,
  ): Promise<RoadPointResult> {
    const kmNum = this.geocodingService.parseKmParam(km);
    return this.geocodingService.roadPoint(ref, kmNum);
  }
}
