import { Injectable } from '@nestjs/common';
import { CreateTemperatureDto } from './dto/create-temperature.dto';
import { UpdateTemperatureDto } from './dto/update-temperature.dto';
import { LiveReading, TempReading } from '@brado/types';
import { LiveReadingEntity } from '../reading/entities/minute-reading.entity';
import { TemperatureEntity } from './entities/temperature.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    return this.tempReadingsRepo.find({ order: { timestamp: 'DESC' } });
  }
}
