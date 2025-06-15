import { Injectable } from '@nestjs/common';
import { TempReading } from '@brado/types';
import { TemperatureEntity } from './entities/temperature.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';

@Injectable()
export class TemperatureService {
  constructor(
    @InjectRepository(TemperatureEntity)
    private tempReadingsRepo: Repository<TemperatureEntity>,
  ) {}

  async addReading(data: TempReading[]) {
    const toSave = this.tempReadingsRepo.create(data);
    try {
      await this.tempReadingsRepo.save(toSave);
      return 'ok';
    } catch (error) {
      throw error;
    }
  }

  async getAll() {
    return this.tempReadingsRepo.find({
      where: {
        timestamp: MoreThan(
          new Date(new Date().setDate(new Date().getDate() - 2))
            .getTime()
            .toString(),
        ),
      },
      order: { timestamp: 'DESC' },
    });
  }

  async deleteOldReadings() {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 5);

    return await this.tempReadingsRepo.delete({
      timestamp: LessThan(fourWeeksAgo.getTime().toString()),
    });
  }
}
