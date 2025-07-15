import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, LessThan, Between, In } from 'typeorm';
import {
  LiveReading,
  DataReadingWithDeltas,
  LiveUpdate,
  HourlyReading,
  GrowingAverage,
  DailyWorkingSummary,
  getDailyWorkingSummary,
} from '@brado/types';
import { ReadingsGateway } from './readings.gateway';
import { LiveReadingEntity } from './entities/minute-reading.entity';
import { ReadingsHelpers } from './readings-helpers';
import { HourlyReadingEntity } from './entities/hourly-reading-entity';
import { DateTime } from 'luxon';
import { exportToExcel, exportToExcelLive } from './export.helper';
import { SettingsService } from '../settings/settings.service';
import { AnnotationService } from '../annotation/annotation.service';
import { WorkingPeriodService } from '../working-period/working-period.service';

@Injectable()
export class ReadingService {
  constructor(
    @InjectRepository(LiveReadingEntity)
    private liveReadingsRepo: Repository<LiveReading>,
    @InjectRepository(HourlyReadingEntity)
    private hourlyReadingsRepo: Repository<HourlyReading>,
    private readonly gateway: ReadingsGateway,
    private settingsService: SettingsService,
    private annotationService: AnnotationService,
    private workPeriodsService: WorkingPeriodService,
  ) {}

  private dailyTotals = new Map<string, number>(); // key: `${sensorId}-${yyyy-mm-dd}`

  private getDateKey(sensorId: number, timestamp: string): string {
    const dateInPoland = DateTime.fromMillis(+timestamp, {
      zone: 'Europe/Warsaw',
    });
    const ymd = dateInPoland.toFormat('yyyy-MM-dd');
    return `${sensorId}-${ymd}`;
  }

  async addReading(readings: [LiveReading]) {
    const uniqueSensorIds = Array.from(
      new Set(readings.map((entity) => entity.sensorId)),
    );
    const readingsToSave: LiveReading[] = [];
    const readingsWithTotals: LiveReading[] = []; // list of readings with today's total

    const grouped = this.groupBySensorId(readings);

    for (const sensorId of Object.keys(grouped)) {
      const readings = grouped[sensorId].sort(
        (a, b) => +a.timestamp - +b.timestamp,
      );

      const lastReading = await this.findLastBySensorId(+sensorId);
      let lastValue = lastReading?.value ?? null;

      for (const r of readings) {
        let delta = 0;
        if (lastValue !== null) {
          delta = r.value >= lastValue ? r.value - lastValue : r.value;
        }

        const rToSave = {
          id: r.id,
          sensorId: r.sensorId,
          value: r.value,
          delta,
          timestamp: r.timestamp,
          isConnectionFailure: r.isConnectionFailure,
          isReset: r.isReset,
        };

        const dateKey = this.getDateKey(rToSave.sensorId, rToSave.timestamp);
        const currentTotal = this.dailyTotals.get(dateKey) ?? 0;

        readingsToSave.push(rToSave);

        const rWithTotal = {
          ...rToSave,
          dailyTotal: currentTotal + delta,
        };

        readingsWithTotals.push(rWithTotal);

        this.dailyTotals.set(dateKey, rWithTotal.dailyTotal);

        lastValue = r.value;
      }
    }

    const uniqueReadings = new Map();

    for (const reading of readingsToSave) {
      const key = `${reading.sensorId}-${reading.timestamp}`;
      if (!uniqueReadings.has(key)) {
        uniqueReadings.set(key, reading);
      }
    }

    const toSave = this.liveReadingsRepo.create([...uniqueReadings.values()]);
    // c = this.liveReadingsRepo.save(readings);

    try {
      this.liveReadingsRepo.save(toSave);

      const liveUpdate: LiveUpdate = {};

      uniqueSensorIds.forEach((id) => {
        liveUpdate[id] = {
          growingAverage: {} as GrowingAverage,
          average60: -1,
          readings: readingsWithTotals.filter(
            (reading) => reading.sensorId === id,
          ),
        };
      });

      this.gateway.sendLifeUpdate(liveUpdate);

      return 'ok';
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

    if (!latestSensor1 || !latestSensor2) {
      return { 1: 0, 2: 0 };
    }

    return { 1: latestSensor1.value, 2: latestSensor2.value };
  }

  async getAverageIncreasing(
    timestamp: string,
  ): Promise<Record<number, GrowingAverage>> {
    const target = await this.settingsService.getSettings();

    const targetPerMinute = target.hourlyTarget / 60;

    const subQuery = this.liveReadingsRepo
      .createQueryBuilder('sub')
      .select('MIN(sub.id)', 'minId')
      .where('sub.delta > :threshold', { threshold: 5 })
      .andWhere('sub.timestamp > :timestamp', { timestamp })
      .groupBy('sub.sensorId');

    const firstReadings = await this.liveReadingsRepo
      .createQueryBuilder('reading')
      .where(`reading.id IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters())
      .getMany();

    const latestReading = await this.liveReadingsRepo
      .createQueryBuilder('r')
      .orderBy('r.timestamp', 'DESC')
      .getOne();

    const now = new Date().getTime();

    const referenceTime = latestReading ? +latestReading.timestamp : now;

    const result: GrowingAverage[] = await Promise.all(
      firstReadings.map(async (reading) => {
        const sumResult = await this.liveReadingsRepo
          .createQueryBuilder('r')
          .select('SUM(r.delta)', 'sum')
          .where('r.sensorId = :sensorId', { sensorId: reading.sensorId })
          .andWhere('r.timestamp >= :timestamp', {
            timestamp: reading.timestamp,
          })
          .getRawOne();

        const minutesSinceFirstReading = Math.floor(
          (referenceTime - +reading.timestamp) / 60000,
        );

        const estimatedProduction = minutesSinceFirstReading * targetPerMinute;

        return {
          sensorId: reading.sensorId,
          estimatedProduction: estimatedProduction,
          realProduction: +sumResult.sum,
          fromTime: reading.timestamp,
          endTime: referenceTime.toString(),
        };
      }),
    );

    const resultRecord: Record<number, GrowingAverage> = {};

    result.forEach((gav) => {
      resultRecord[gav.sensorId] = gav;
    });

    return resultRecord;
  }

  async getAverageSpeedsLastXMinutes(
    sensorIds: number[],
    minutes: number,
  ): Promise<Record<number, number>> {
    const from = Date.now() - minutes * 60 * 1000;

    const readings = await this.liveReadingsRepo.find({
      where: {
        timestamp: MoreThan(from.toString()),
        sensorId: In(sensorIds),
      },
    });

    if (readings.length === 0) {
      return {};
    }

    const groupedBySensor = readings.reduce(
      (acc, reading) => {
        if (!acc[reading.sensorId]) {
          acc[reading.sensorId] = [];
        }
        acc[reading.sensorId].push(reading);
        return acc;
      },
      {} as Record<number, LiveReading[]>,
    );

    const result: Record<number, number> = {};

    for (const sensorId of Object.keys(groupedBySensor)) {
      const sensorReadings = groupedBySensor[+sensorId];
      const sumDelta = sensorReadings.reduce(
        (sum, reading) => sum + (reading.delta || 0),
        0,
      );
      const averageDelta = sumDelta / sensorReadings.length;

      result[+sensorId] = averageDelta; // Przechowaj średnią w obiekcie wynikowym
    }

    return result;
  }

  async getInitialLiveData(startOfTheDateTS: string): Promise<LiveUpdate> {
    console.log('Getting initial live data', startOfTheDateTS);

    const workingPeriods = await this.workPeriodsService.findLatest();

    const startTimes = workingPeriods.map(p => +p.start);

    let startTime = Date.now() - 24 * 60 * 60 * 1000;

    if (startTimes.length) {
      startTime = Math.min(...startTimes);
    }

    // Todo debug only
    // const todayData = await this.getAfterTime(startOfTheDateTS);

    const todayData = await this.liveReadingsRepo.find({
      where: {
        timestamp: MoreThan(startTime.toString()),
      },
      order: { timestamp: 'ASC' },
    });

    const uniqueSensorIds = Array.from(
      new Set(todayData.map((entity) => entity.sensorId)),
    );

    if (!todayData.length) {
      return {};
    }

    const average60 = await this.getAverageSpeedsLastXMinutes(
      uniqueSensorIds,
      60,
    );

    const growingAverage = await this.getAverageIncreasing(startOfTheDateTS);

    const liveUpdate: LiveUpdate = {};

    uniqueSensorIds.forEach((id) => {
      const todayWithTotal = this.attachRunningTotal(
        todayData.filter((reading) => reading.sensorId === id),
      );

      const lastRWithTotal = todayWithTotal[todayWithTotal.length - 1];
      const dateKey = this.getDateKey(
        lastRWithTotal.sensorId,
        lastRWithTotal.timestamp,
      );

      this.dailyTotals.set(dateKey, lastRWithTotal.dailyTotal ?? 0);

      liveUpdate[id] = {
        growingAverage: growingAverage[id],
        average60: average60[id],
        readings: todayWithTotal,
      };
    });

    return liveUpdate;
  }

  attachRunningTotal(readings: LiveReading[]): LiveReading[] {
    let dailyTotal = 0;
    return readings.map((r) => {
      dailyTotal += r.delta ?? 0;
      return { ...r, dailyTotal };
    });
  }

  async getLatestReadingsBeforeDate(
    startOfTheDateTS: string,
    sensorIds: number[],
  ): Promise<LiveReading[]> {
    const readings: LiveReading[] = [];

    for (const sensorId of sensorIds) {
      const latestReading = await this.liveReadingsRepo.findOne({
        where: { sensorId, timestamp: LessThan(startOfTheDateTS) },
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
      let previousValue: number | null =
        lastDayReadingMap.get(+sensorId) ?? null;
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

    const uniqueSensorIds = Array.from(
      new Set(liveReadings.map((entity) => entity.sensorId)),
    );

    const hourlyReadings = uniqueSensorIds
      .map((sensorID) =>
        ReadingsHelpers.aggregateToHourlyReadings(
          liveReadings.filter((reading) => reading.sensorId === +sensorID),
        ),
      )
      .flat();

    const toSave = this.hourlyReadingsRepo.create(hourlyReadings);

    try {
      this.hourlyReadingsRepo.upsert(toSave, ['timestamp', 'sensorId']);
      return Promise.resolve('Aggregated');
    } catch (error) {
      throw error;
    }
  }

  async findLastBySensorId(sensorId: number): Promise<LiveReading | null> {
    return this.liveReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .orderBy('reading.timestamp', 'DESC')
      .limit(1)
      .getOne();
  }

  async findLastNBySensorIdBeforeTs(
    sensorId: number,
    timestamp: string,
    n: number,
  ): Promise<LiveReading[]> {
    return this.liveReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .andWhere('timestamp < :timestamp', { timestamp })
      .orderBy('reading.timestamp', 'DESC')
      .limit(n)
      .getMany();
  }

  async findLastNBySensorId(
    sensorId: number,
    n: number,
  ): Promise<LiveReading[]> {
    return this.liveReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .orderBy('reading.timestamp', 'DESC')
      .limit(n)
      .getMany();
  }

  async findNextBySensorIdAfterTimestamp(
    sensorId: number,
    timestamp: string,
  ): Promise<LiveReading | null> {
    return this.liveReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .andWhere('reading.timestamp > :timestamp', { timestamp })
      .orderBy('reading.timestamp', 'ASC')
      .limit(1)
      .getOne();
  }

  private groupBySensorId(
    readings: LiveReading[],
  ): Record<string, LiveReading[]> {
    return readings.reduce(
      (acc, reading) => {
        (acc[reading.sensorId] = acc[reading.sensorId] || []).push(reading);
        return acc;
      },
      {} as Record<string, LiveReading[]>,
    );
  }

  async getMonthlyStats(fromTS: string, endTS: string) {
    // const hourlyReadings = await this.getHourly(fromTS, endTS);
    const hourlyReadings = await this.hourlyReadingsRepo.find({
      where: {
        timestamp: Between(fromTS, endTS),
      },
      order: { timestamp: 'ASC' },
    });

    const annotations = await this.annotationService.getBetween(fromTS, endTS);
    const settings = await this.settingsService.getSettings();
    const workingPeriods = await this.workPeriodsService.getBetween(
      fromTS,
      endTS,
    );

    const uniqueSensorIds = Array.from(
      new Set(hourlyReadings.map((entity) => entity.sensorId)),
    );

    const summaries: { [key: string]: DailyWorkingSummary } = {};

    uniqueSensorIds.forEach((sensorId) => {

      console.log('SUMA')
      console.log(
          hourlyReadings.filter((r) => r.sensorId === sensorId)
              .map(r => r.delta).reduce((a, b) => a + b, 0)
      )
      const summary = getDailyWorkingSummary(
        hourlyReadings.filter((r) => r.sensorId === sensorId),
        annotations.filter((a) => a.sensorId === sensorId),
        workingPeriods.filter((wp) => wp.sensorId === sensorId),
        settings.hourlyTarget,
        fromTS,
        endTS,
      );

      if (summary != null) {
        summaries[sensorId] = summary;
      }
    });

    return summaries;
  }

  async getHourly(fromTS: string, toTS: string) {
    const readings = await this.hourlyReadingsRepo.find({
      where: {
        timestamp: Between(fromTS, toTS),
      },
      order: { timestamp: 'ASC' },
    });

    const uniqueSensorIds = Array.from(
      new Set(readings.map((entity) => entity.sensorId)),
    );

    uniqueSensorIds.forEach((sensorId) => {
      let currentlyCalculatedDate = '';
      let currentSum = 0;

      readings
        .filter((r) => r.sensorId === sensorId)
        .sort((a, b) => +a.timestamp - +b.timestamp)
        .forEach((r) => {
          const dt = ReadingsHelpers.tsToPolishDate(+r.timestamp).toFormat(
            'dd-MM-yyyy',
          );

          if (currentlyCalculatedDate !== dt) {
            currentlyCalculatedDate = dt;
            currentSum = 0;
          }
          currentSum += r.delta;
          r.dailyTotal = currentSum;
        });
    });

    return readings;
  }

  async exportData(fromTS: string, toTS: string): Promise<Buffer> {
    const hourly = await this.getHourly(fromTS, toTS);
    const settings = await this.settingsService.getSettings();

    return exportToExcel(hourly, settings);
  }

  async exportLiveData(fromTS: string): Promise<Buffer> {
    const liveData = await this.getInitialLiveData(fromTS);
    const settings = await this.settingsService.getSettings();

    return exportToExcelLive(liveData, settings);
  }

  async deleteOldReadings() {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 60);

    return await this.liveReadingsRepo.delete({
      timestamp: LessThan(fourWeeksAgo.getTime().toString()),
    });
  }

  async createOrUpdateLiveReading(reading: LiveReading): Promise<LiveReading> {
    let readingToSave = reading;
    let existing: null | LiveReading = null;

    if (reading.id) {
      // Try to find existing entity by ID
      existing = await this.liveReadingsRepo.findOne({
        where: { id: reading.id },
      });

      if (existing) {
        // Merge and update
        readingToSave = this.liveReadingsRepo.merge(existing, reading);
      }
    }

    // Recalculate delta value for current reading
    // Find the previous reading for this sensor
    const previousReadings = await this.findLastNBySensorIdBeforeTs(
      reading.sensorId,
      reading.timestamp,
      2,
    );
    let previousReading: LiveReading | undefined;

    // If we're updating an existing reading, we need to find the reading before it
    if (reading.id && previousReadings.length > 0) {
      // Filter out the current reading if it's in the results
      previousReading = previousReadings.find((r) => r.id !== reading.id);
    } else if (previousReadings.length > 0) {
      // For new readings, just get the last one
      previousReading = previousReadings[0];
    }

    console.log('PREV');
    console.log(previousReadings);

    // Calculate delta based on previous reading
    let delta = 0;
    if (previousReading) {
      // If current value is less than previous value (sensor reset), delta is the current value
      // Otherwise, delta is the difference
      delta =
        readingToSave.value >= previousReading.value
          ? readingToSave.value - previousReading.value
          : readingToSave.value;
    }

    // Update the delta value
    readingToSave.delta = delta;

    // Update daily totals if needed
    const dateKey = this.getDateKey(
      readingToSave.sensorId,
      readingToSave.timestamp,
    );
    const currentTotal = this.dailyTotals.get(dateKey) ?? 0;

    // If this is an update, we need to adjust the daily total
    if (reading.id) {
      // Get the old delta value if available
      const oldDelta = existing?.delta ?? 0;
      // Adjust the daily total by removing the old delta and adding the new one
      this.dailyTotals.set(dateKey, currentTotal - oldDelta + delta);
    } else {
      // For new readings, just add the delta to the current total
      this.dailyTotals.set(dateKey, currentTotal + delta);
    }

    // Create new entity
    const created = this.liveReadingsRepo.create(readingToSave);
    await this.liveReadingsRepo.save(created);

    // Find the next reading after this one to update its delta
    const nextReading = await this.findNextBySensorIdAfterTimestamp(
      reading.sensorId,
      reading.timestamp,
    );

    console.log('NEXT');
    console.log(nextReading);
    if (nextReading) {
      // Calculate the new delta for the next reading
      const nextDelta =
        nextReading.value >= readingToSave.value
          ? nextReading.value - readingToSave.value
          : nextReading.value;

      // Only update if the delta has changed
      if (nextDelta !== nextReading.delta) {
        // Update the next reading's delta
        const nextDateKey = this.getDateKey(
          nextReading.sensorId,
          nextReading.timestamp,
        );
        const nextCurrentTotal = this.dailyTotals.get(nextDateKey) ?? 0;

        // Adjust the daily total for the next reading
        this.dailyTotals.set(
          nextDateKey,
          nextCurrentTotal - nextReading.delta + nextDelta,
        );

        // Update the next reading in the database
        nextReading.delta = nextDelta;
        await this.liveReadingsRepo.save(nextReading);
      }
    }

    return created;
  }
}
