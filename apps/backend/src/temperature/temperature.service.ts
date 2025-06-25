import { Injectable } from '@nestjs/common';
import { TempReading } from '@brado/types';
import { TemperatureEntity } from './entities/temperature.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { ReadingsGateway } from '../reading/readings.gateway';

@Injectable()
export class TemperatureService {
  constructor(
    @InjectRepository(TemperatureEntity)
    private tempReadingsRepo: Repository<TemperatureEntity>,
    private readonly gateway: ReadingsGateway,
  ) {}

  async addReading(data: TempReading[]) {
    const toSave = this.tempReadingsRepo.create(data);
    try {
      await this.tempReadingsRepo.save(toSave);
      this.gateway.sendLifeTempUpdate(toSave);
      return 'ok';
    } catch (error) {
      throw error;
    }
  }

  async getLatest(): Promise<TemperatureEntity[]> {
    const sensorIdRows = await this.tempReadingsRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.sensorId', 'sensorId')
      .getRawMany();

    const sensorIds = sensorIdRows.map((row) => row.sensorId);

    const readings: TemperatureEntity[] = [];

    for (const sensorId of sensorIds) {
      const latestReading = await this.tempReadingsRepo
        .createQueryBuilder('t')
        .where('t.sensorId = :sensorId', { sensorId })
        .orderBy('t.timestamp', 'DESC')
        .limit(1)
        .getOne();

      if (latestReading) {
        readings.push(latestReading);
      }
    }

    return readings;
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
