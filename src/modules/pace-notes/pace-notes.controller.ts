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
import { PaceNotesService } from './pace-notes.service';
import { CreatePaceNoteDto } from './dto/create-pace-note.dto';
import { UpdatePaceNoteDto } from './dto/update-pace-note.dto';

@Controller('pace-notes')
@UseGuards(JwtAuthGuard)
export class PaceNotesController {
  constructor(private readonly paceNotesService: PaceNotesService) {}

  @Get('stage/:stageId')
  findByStage(@Param('stageId') stageId: string) {
    return this.paceNotesService.findByStage(stageId);
  }

  @Post()
  create(@Body() dto: CreatePaceNoteDto) {
    return this.paceNotesService.create(dto);
  }

  @Post('bulk')
  bulkCreate(@Body() dtos: CreatePaceNoteDto[]) {
    return this.paceNotesService.bulkCreate(dtos);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaceNoteDto) {
    return this.paceNotesService.update(id, dto);
  }

  @Delete('stage/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeByStage(@Param('stageId') stageId: string) {
    return this.paceNotesService.removeByStage(stageId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.paceNotesService.remove(id);
  }
}
