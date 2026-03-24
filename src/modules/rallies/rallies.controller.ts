import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RalliesService } from './rallies.service';
import { CreateRallyDto } from './dto/create-rally.dto';
import { UpdateRallyDto } from './dto/update-rally.dto';

@Controller('rallies')
@UseGuards(JwtAuthGuard)
export class RalliesController {
  constructor(private readonly ralliesService: RalliesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.ralliesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.ralliesService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateRallyDto, @Request() req: any) {
    return this.ralliesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRallyDto, @Request() req: any) {
    return this.ralliesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.ralliesService.remove(id, req.user.id);
  }
}
