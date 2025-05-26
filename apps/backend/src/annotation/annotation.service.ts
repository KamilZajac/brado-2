import { Injectable } from '@nestjs/common';
import { AnnotationEntity } from './entities/annotation.entity';
import { InjectRepository} from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { Annotation, User } from '@brado/types';

// import { Annotation } from '@brado/types';

@Injectable()
export class AnnotationService {
  constructor(
    @InjectRepository(AnnotationEntity)
    private readonly annotationRepository: Repository<AnnotationEntity>,
  ) {}

  async create(user: User, data: Partial<Annotation>): Promise<Annotation> {
    const annotation = this.annotationRepository.create({
      ...data,
      user: { id: user.id },
    });
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
        timestamp: MoreThan(date),
      },
      order: { timestamp: 'ASC' },
    });
  }

  getBetween(fromTS: string, toTS: string) {
    return this.annotationRepository.find({
      where: {
        timestamp: Between(fromTS, toTS),
      },
      order: { timestamp: 'ASC' },
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
}
