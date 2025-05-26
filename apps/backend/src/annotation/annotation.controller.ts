import { AnnotationService } from './annotation.service';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {Annotation, User} from '@brado/types';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('annotation')
export class AnnotationController {
  constructor(private readonly annotationService: AnnotationService) {}

  @Post()
  async createAnnotation(
    @Request() req,
    @Body() body: Partial<Annotation>,
  ) {
    const user: User = req.user; // Get user data from JWT
    return this.annotationService.create(user, body);
  }

  @Get()
  async getAllAnnotations(@Request() req) {
    const user: User = req.user;
    return this.annotationService.findAllByUser(user);
  }


  @Get('after/:timestamp')
  getAfter(@Param('timestamp') ts: string) {
    return this.annotationService.getAfterTime(ts);
  }

  @Get('between/:fromTS/:toTS')
  getFromTo(@Param('fromTS') fromTS: string, @Param('toTS') toTS: string) {
    return this.annotationService.getBetween(fromTS, toTS);
  }


  @Get(':id')
  async getAnnotationById(@Request() req, @Param('id') id: number) {
    const user: User = req.user;
    return this.annotationService.findOneById(id, user);
  }

  @Put(':id')
  async updateAnnotation(
    @Request() req,
    @Param('id') id: number,
    @Body() body: { value?: number; text?: string },
  ) {
    const user: User = req.user;
    return this.annotationService.update(id, user, body);
  }

  @Delete(':id')
  async deleteAnnotation(@Request() req, @Param('id') id: number) {
    const user: User = req.user;
    return this.annotationService.delete(id, user);
  }
}
