import { Injectable } from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {MoreThan, Repository, LessThan, MoreThanOrEqual, Between} from "typeorm";
import {LiveReading, DataReadingWithDeltas, LiveUpdate, HourlyReading} from "@brado/types";
import {ReadingsGateway} from "./readings.gateway";
import {LiveReadingEntity} from "./entities/minute-reading.entity";
import {ReadingsHelpers} from "./readings-helpers";
import {HourlyReadingEntity} from "./entities/hourly-reading-entity";

@Injectable()
export class ReadingService {
  constructor(
      @InjectRepository(LiveReadingEntity)
      private liveReadingsRepo: Repository<LiveReading>,
      @InjectRepository(HourlyReadingEntity)
      private hourlyReadingsRepo: Repository<HourlyReading>,
      private readonly gateway: ReadingsGateway,
  ) {}

  async addReading(readings:  [LiveReading]) {
    console.log(readings)
    const toSave = this.liveReadingsRepo.create(readings);

    try{
      console.log(toSave[0])
      this.liveReadingsRepo.save(toSave);

      const uniqueSensorIds = Array.from(new Set(toSave.map(entity => entity.sensorId)));

      const average5 = await this.getAverageSpeedsLastXMinutes(uniqueSensorIds, 5);
      const average60 = await this.getAverageSpeedsLastXMinutes(uniqueSensorIds, 60);

      // Todo this should be calculated for the whole set
      // const readingsWithDeltas = readings.map((async (reading) => this.calculateDeltasForNewReading(reading)));
      const liveUpdate: LiveUpdate = {}

      uniqueSensorIds.forEach(id => {
        liveUpdate[id] = {
          average5: average5[id],
          average60: average60[id],
          readings: [] // readings.filter(reading => reading.sensorId === id) // Todo think about last reading for delta
        }
      })

      this.gateway.sendLifeUpdate(liveUpdate)

      return 'ok'
    } catch (error) {
      throw error;
    }
  }

  async getAll() {
    return this.liveReadingsRepo.find({ order: { timestamp: 'DESC' } });
  }

  getAfterTime(date: string) {
    return this.liveReadingsRepo.find({
      where: {
        timestamp: MoreThan(date),
      },
      order: { timestamp: 'ASC' },
    });
  }

  async getLatest() {
    const latestSensor1 = await this.liveReadingsRepo.findOne({
      where: { sensorId: 1 },
      order: { timestamp: 'DESC' },
    });

    const latestSensor2 = await this.liveReadingsRepo.findOne({
      where: { sensorId: 2 },
      order: { timestamp: 'DESC' },
    });

    if(!latestSensor1 || !latestSensor2) {
      throw new Error('Nie ma')
    }

    return {1: latestSensor1.value, 2: latestSensor2.value};
  }

  async getAverageSpeedsLastXMinutes(
      sensorIds: number[],
      minutes: number,
  ): Promise<Record<number, number>> {
    const from = Date.now() - minutes * 60 * 1000;

    // Get first and last value per sensor
    const raw = await this.liveReadingsRepo
        .createQueryBuilder('reading')
        .select('reading.sensorId', 'sensorId')
        .addSelect('MIN(reading.timestamp)', 'firstTimestamp')
        .addSelect('MAX(reading.timestamp)', 'lastTimestamp')
        .addSelect('MIN(reading.value)', 'firstValue')
        .addSelect('MAX(reading.value)', 'lastValue')
        .where('reading.sensorId IN (:...sensorIds)', { sensorIds })
        .andWhere('reading.timestamp > :from', { from })
        .groupBy('reading.sensorId')
        .getRawMany();


    // console.log(raw)

    const result: Record<number, number> = {};

    for (const row of raw) {
      // Upewniamy się, że pracujemy na liczbach zamiast na obiektach Date
      const timeDiff = row.lastTimestamp - row.firstTimestamp; // Różnica w ms

      // Oblicz liczbę minut na podstawie różnicy czasu
      const minutesElapsed = timeDiff / 1000 / 60; // ms -> s -> min
      const valueDiff = row.lastValue - row.firstValue; // Różnica wartości

      // Oblicz prędkość (średnia różnica wartości na minutę)
      const speed = minutesElapsed > 0 ? Math.round(valueDiff / minutesElapsed) : 0;

      result[row.sensorId] = speed;
    }


    return result;
  }

  async getInitialLiveData(startOfTheDateTS: string) {
    console.log('Getting initial live data', startOfTheDateTS)



    // console.log(adjustTimezone(getStartOfToday()))


    const todayData = await this.getAfterTime(startOfTheDateTS);
    console.log('Got today data')
    console.log(todayData)

    if(!todayData.length) {
      return []
    }
    const uniqueSensorIds = Array.from(new Set(todayData.map(entity => entity.sensorId)));

    const lastDayLastReadings = await this.getLatestReadingsBeforeDate(startOfTheDateTS, uniqueSensorIds)

    const readingsWithDeltas = this.calculateDeltasForDataset(todayData, lastDayLastReadings)

    const average5 = await this.getAverageSpeedsLastXMinutes(uniqueSensorIds, 5);
    const average60 = await this.getAverageSpeedsLastXMinutes(uniqueSensorIds, 60);

    const liveUpdate: LiveUpdate = {}

    uniqueSensorIds.forEach(id => {
      liveUpdate[id] = {
        average5: average5[id],
        average60: average60[id],
        readings: readingsWithDeltas.filter(reading => reading.sensorId === id)
      }
    })

    return liveUpdate
  }

  async  getLatestReadingsBeforeDate(startOfTheDateTS: string, sensorIds: number[]): Promise<LiveReading[]> {
    const readings: LiveReading[] = [];

    for (const sensorId of sensorIds) {
      const latestReading = await this.liveReadingsRepo.findOne({
        where: { sensorId, timestamp: LessThan(startOfTheDateTS)  },
        order: { timestamp: 'DESC' },
      });

      if (latestReading) {
        readings.push(latestReading);
      }
    }

    return readings;
  }



  calculateDeltasForDataset(
      readings: LiveReading[],
      lastDayReadings: LiveReading[], // one reading per sensor from last day
  ): DataReadingWithDeltas[] {
    readings.sort((a, b) => +a.timestamp - +b.timestamp);

    const readingsBySensor: Record<number, LiveReading[]> = {};

    readings.forEach((reading) => {
      if (!readingsBySensor[reading.sensorId]) {
        readingsBySensor[reading.sensorId] = [];
      }
      readingsBySensor[reading.sensorId].push(reading);
    });

    const lastDayReadingMap = new Map<number, number>();
    lastDayReadings.forEach((reading) => {
      lastDayReadingMap.set(reading.sensorId, reading.value);
    });

    const results: DataReadingWithDeltas[] = [];

    for (const sensorId in readingsBySensor) {
      const sensorReadings = readingsBySensor[sensorId];
      let previousValue: number | null = lastDayReadingMap.get(+sensorId) ?? null;
      const todayStartValue: number = sensorReadings[0].value;
      let accumulatedDeltaToday = 0;

      for (let i = 0; i < sensorReadings.length; i++) {
        const reading = sensorReadings[i];

        let deltaFromPrevious: number;
        if (previousValue === null || reading.value < previousValue) {
          deltaFromPrevious = reading.value;
        } else {
          deltaFromPrevious = reading.value - previousValue;
        }

        accumulatedDeltaToday += deltaFromPrevious;


        results.push({
          ...reading,
          previous: previousValue,
          deltaFromPrevious,
          todayStart: todayStartValue,
              deltaToday: accumulatedDeltaToday,

        });

        previousValue = reading.value;
      }
    }

    return results;
  }


  async aggregate() {
    const liveReadings = await this.liveReadingsRepo.find({
      order: { timestamp: 'ASC' },
    });

    const uniqueSensorIds = Array.from(new Set(liveReadings.map(entity => entity.sensorId)));

    const hourlyReadings =
        uniqueSensorIds.map(sensorID =>
      ReadingsHelpers.aggregateToHourlyReadings(liveReadings.filter(reading => reading.sensorId === +sensorID))).flat();


    console.log(hourlyReadings[0])
    const toSave = this.hourlyReadingsRepo.create(hourlyReadings);

    try {
      console.log(toSave[0])
      this.hourlyReadingsRepo.save(toSave);
      return Promise.resolve("ok");

    } catch (error) {
      throw error
    }
  }

  getWeekly(startOfTheWeekTS: string) {

  }

  getHourly(fromTS: string, toTS: string) {
    return this.hourlyReadingsRepo.find({
      where: {
        timestamp: Between(fromTS, toTS),
      },
      order: { timestamp: 'ASC' },
    });
  }
}
