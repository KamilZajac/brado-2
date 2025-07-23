import { Module } from '@nestjs/common';
import { AnnotationService } from './annotation.service';
import { AnnotationController } from './annotation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnotationEntity } from './entities/annotation.entity';
import {WorkingPeriodModule} from "../working-period/working-period.module";

@Module({
  controllers: [AnnotationController],
  providers: [AnnotationService],
  imports: [TypeOrmModule.forFeature([AnnotationEntity]), WorkingPeriodModule],
  exports: [AnnotationService],
})
export class AnnotationModule {}
