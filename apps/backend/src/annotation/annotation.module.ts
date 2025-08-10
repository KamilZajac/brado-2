import { forwardRef, Module } from '@nestjs/common';
import { AnnotationService } from './annotation.service';
import { AnnotationController } from './annotation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnotationEntity } from './entities/annotation.entity';
import { WorkingPeriodModule } from '../working-period/working-period.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [AnnotationController],
  providers: [AnnotationService],
  imports: [
    TypeOrmModule.forFeature([AnnotationEntity]),
    forwardRef(() => WorkingPeriodModule),
    forwardRef(() => NotificationsModule),
  ],
  exports: [AnnotationService],
})
export class AnnotationModule {}
