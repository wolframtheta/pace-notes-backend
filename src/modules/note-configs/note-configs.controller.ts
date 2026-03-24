import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NoteConfigsService } from './note-configs.service';
import { CreateNoteConfigDto } from './dto/create-note-config.dto';
import { UpdateNoteConfigDto } from './dto/update-note-config.dto';

@Controller('note-configs')
@UseGuards(JwtAuthGuard)
export class NoteConfigsController {
  constructor(private readonly noteConfigsService: NoteConfigsService) {}

  @Get()
  findAll() {
    return this.noteConfigsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateNoteConfigDto) {
    return this.noteConfigsService.create(dto);
  }

  @Post('initialize-defaults')
  @HttpCode(HttpStatus.NO_CONTENT)
  initializeDefaults() {
    return this.noteConfigsService.initializeDefaults();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteConfigDto) {
    return this.noteConfigsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.noteConfigsService.remove(id);
  }
}
