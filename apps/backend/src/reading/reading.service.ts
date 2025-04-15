import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Reading} from "./entities/reading.entity";
import {MoreThan, Repository} from "typeorm";
import {DataReading} from "@brado/shared-models";
import {ReadingsGateway} from "./readings.gateway";

@Injectable()
export class ReadingService {
  constructor(
      @InjectRepository(Reading)
      private readingsRepo: Repository<Reading>,
      private readonly gateway: ReadingsGateway,
  ) {}

  async addReading(readings:  [DataReading]) {
    console.log(readings);
    const toSave = this.readingsRepo.create(readings);

    this.gateway.sendNewReading(readings)
    return this.readingsRepo.save(toSave);
  }

  async getAll() {
    return this.readingsRepo.find({ order: { timestamp: 'DESC' } });
  }

  getAfterTime(ts: string) {
    return this.readingsRepo.find({
      where: {
        timestamp: MoreThan(new Date(ts)),
      },
      order: { timestamp: 'ASC' },
    });
  }
}
