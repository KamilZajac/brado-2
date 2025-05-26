import { Module } from '@nestjs/common';
import { AnnotationService } from './annotation.service';
import { AnnotationController } from './annotation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnotationEntity } from './entities/annotation.entity';

@Module({
  controllers: [AnnotationController],
  providers: [AnnotationService],
  imports: [TypeOrmModule.forFeature([AnnotationEntity])],
})
export class AnnotationModule {}
