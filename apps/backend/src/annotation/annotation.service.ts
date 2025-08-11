import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AnnotationEntity } from './entities/annotation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThan, Repository } from 'typeorm';
import { Annotation, AnnotationType, User } from '@brado/types';
import { WorkingPeriodService } from '../working-period/working-period.service';
import {NotificationsService} from "../notifications/notifications.service";

// import { Annotation } from '@brado/types';

@Injectable()
export class AnnotationService {
  constructor(
    @InjectRepository(AnnotationEntity)
    private readonly annotationRepository: Repository<AnnotationEntity>,
    @Inject(forwardRef(() => WorkingPeriodService))
    private workPeriodsService: WorkingPeriodService,
    @Inject(forwardRef(() => NotificationsService))
    private pushService: NotificationsService
  ) {}

  async create(user: User, data: Partial<Annotation>): Promise<Annotation> {
    const annotation = this.annotationRepository.create({
      ...data,
      user: { id: user.id },
    });


    if (data.type === AnnotationType.ACCIDENT_FROM_TO) {
      this.pushService.broadcastAll({
        title: 'Awaria',
        body: 'Zgłoszono awarię'
      })

    }
      return await this.annotationRepository.save(annotation);
  }

  async findAllByUser(user: User): Promise<Annotation[]> {
    return this.annotationRepository.find({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
  }

  getAfterTime(date: string) {
    return this.annotationRepository.find({
      where: {
        from_timestamp: MoreThan(date),
      },
      order: { from_timestamp: 'ASC' },
      relations: ['user'],
    });
  }

  getBetween(fromTS: string, toTS: string) {
    return this.annotationRepository.find({
      where: {
        from_timestamp: Between(fromTS, toTS),
      },
      order: { from_timestamp: 'ASC' },
      relations: ['user'],
    });
  }

  async findOneById(id: number, user: User): Promise<AnnotationEntity | null> {
    return this.annotationRepository.findOne({
      where: { id, user },
      relations: ['user'],
    });
  }

  async update(
    id: number,
    user: User,
    data: { value?: number; text?: string },
  ): Promise<AnnotationEntity> {
    const annotation = await this.findOneById(id, user);

    if (!annotation) {
      throw new Error(
        'Annotation not found or you do not have access to update this annotation',
      );
    }

    Object.assign(annotation, data); // Merge new data
    return this.annotationRepository.save(annotation);
  }

  async delete(id: number, user: User): Promise<boolean> {
    const annotation = await this.findOneById(id, user);

    if (!annotation) {
      throw new Error(
        'Annotation not found or you do not have access to delete this annotation',
      );
    }

    await this.annotationRepository.remove(annotation);
    return true;
  }

  async getCurrentAnnotations() {
    const workingPeriods = await this.workPeriodsService.findLatest();

    const startTimes = workingPeriods.map((p) => +p.start);

    let startTime = Date.now() - 24 * 60 * 60 * 1000;

    if (startTimes.length) {
      startTime = Math.min(...startTimes);
    }

    // Todo debug only
    // const todayData = await this.getAfterTime(startOfTheDateTS);

    return this.annotationRepository.find({
      where: {
        from_timestamp: MoreThan(startTime.toString()),
      },
      order: { from_timestamp: 'ASC' },
    });
  }
}
