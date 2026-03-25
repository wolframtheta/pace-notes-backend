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
import { NoteGroupsService } from './note-groups.service';
import { CreateNoteGroupDto } from './dto/create-note-group.dto';
import { UpdateNoteGroupDto } from './dto/update-note-group.dto';

@Controller('note-groups')
@UseGuards(JwtAuthGuard)
export class NoteGroupsController {
  constructor(private readonly noteGroupsService: NoteGroupsService) {}

  @Get('stage/:stageId')
  findByStage(@Param('stageId') stageId: string) {
    return this.noteGroupsService.findByStage(stageId);
  }

  @Post()
  create(@Body() dto: CreateNoteGroupDto) {
    return this.noteGroupsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteGroupDto) {
    return this.noteGroupsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.noteGroupsService.remove(id);
  }
}
