import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get()
  findAll(@Query('rallyId') rallyId: string, @Request() req: any) {
    if (!rallyId) throw new BadRequestException('rallyId query param is required');
    return this.stagesService.findByRally(rallyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.stagesService.findOneScoped(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateStageDto, @Request() req: any) {
    return this.stagesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto, @Request() req: any) {
    return this.stagesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.stagesService.remove(id, req.user.id);
  }
}
