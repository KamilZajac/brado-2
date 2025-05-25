import { Module } from '@nestjs/common';
import { AnnotationService } from './annotation.service';
import { AnnotationController } from './annotation.controller';

@Module({
  controllers: [AnnotationController],
  providers: [AnnotationService],
})
export class AnnotationModule {}
