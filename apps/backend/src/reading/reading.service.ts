import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThan, MoreThan, Repository } from 'typeorm';
import {
  DailyWorkingSummary,
  DataReadingWithDeltas,
  detectBreaks,
  getDailyWorkingSummary,
  GrowingAverage,
  HourlyReading,
  LiveReading,
  LiveUpdate,
  ProductionBreak,
  WorkingPeriodType,
} from '@brado/types';
import { ReadingsGateway } from './readings.gateway';
import { LiveReadingEntity } from './entities/minute-reading.entity';
import { ReadingsHelpers } from './readings-helpers';
import { HourlyReadingEntity } from './entities/hourly-reading-entity';
import { DateTime } from 'luxon';
import {
  exportToExcel,
  exportToExcelLive,
  exportToExcelRAW,
} from './export.helper';
import { SettingsService } from '../settings/settings.service';
import { AnnotationService } from '../annotation/annotation.service';
import { WorkingPeriodService } from '../working-period/working-period.service';
import { TimeHelper } from '../shared/time.helpers';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  private lastReadingTime: number | null = null;
  private hasNotifiedNoReadings = false;
  private hasNotifiedReadingsResumed = false;
  private readonly NOTIFICATION_THRESHOLD_MS = 10 * 60 * 1000; // 5 minutes in milliseconds
  private readonly BREAK_THRESHOLD_MINUTES = 5; // 5 minutes
  private lastNotifiedBreaks: Map<number, string> = new Map(); // Map of sensorId to break end timestamp

  constructor(
    @InjectRepository(LiveReadingEntity)
    private liveReadingsRepo: Repository<LiveReading>,
    @InjectRepository(HourlyReadingEntity)
    private hourlyReadingsRepo: Repository<HourlyReading>,
    private readonly gateway: ReadingsGateway,
    private settingsService: SettingsService,
    private annotationService: AnnotationService,
    @Inject(forwardRef(() => WorkingPeriodService))
    private workPeriodsService: WorkingPeriodService,
    private notificationsService: NotificationsService,
  ) {}

  private dailyTotals = new Map<string, number>(); // key: `${sensorId}-${yyyy-mm-dd}`

  private getDateKey(sensorId: number, timestamp: string): string {
    const dateInPoland = DateTime.fromMillis(+timestamp, {
      zone: 'Europe/Warsaw',
    });
    const ymd = dateInPoland.toFormat('yyyy-MM-dd');
    return `${sensorId}-${ymd}`;
  }

  /**
   * Checks for breaks in production and sends notifications if breaks are detected
   * @param newReadings The new readings to check for breaks
   */
  private async checkForBreaks(newReadings: [LiveReading]): Promise<void> {
    // For each sensor in the new readings, get the last N readings
    const uniqueSensorIds = Array.from(
      new Set(newReadings.map((entity) => entity.sensorId)),
    );

    for (const sensorId of uniqueSensorIds.filter(sensorId => sensorId === 2)) { // for now - check only production sensor
      const currentWorkPeriod = await this.workPeriodsService.findLatest(
        WorkingPeriodType.LIVE, sensorId.toString()
      );

      const periodStart = currentWorkPeriod.length > 0 ? currentWorkPeriod[0].start : undefined;
      const periodEnd = currentWorkPeriod.length > 0 ? currentWorkPeriod[0].end : undefined;

      if (periodEnd && +periodEnd < new Date().getTime()) {
        return
      }

      // Get the last 30 readings for this sensor (including the new ones)
      const lastReadings = await this.findLastNBySensorId(sensorId, 240, periodStart)

      // Detect breaks in these readings
      const detectedBreaks = this.detectBreaks(lastReadings);

      const breakItem = detectedBreaks[detectedBreaks.length - 1];

      if(!breakItem) {
        return
      }
      // Send notifications for new breaks
        // Check if we've already notified about this break
        const lastNotifiedBreakEnd = this.lastNotifiedBreaks.get(
          breakItem.sensorId,
        );

        // If we haven't notified about this break yet, or it's a different break
        if (!lastNotifiedBreakEnd || lastNotifiedBreakEnd != breakItem.end) {
          // Format the duration in minutes
          const durationMinutes = Math.floor(breakItem.duration);

          // Send notification
          await this.notificationsService.broadcastAll({
            title: `Wykryto przerwę w produkcji`,
            body: `Przerwa: ${durationMinutes} minut.`
          });

          // Update the last notified break for this sensor
          this.lastNotifiedBreaks.set(breakItem.sensorId, breakItem.end);

        }

    }
  }

  /**
   * Detects breaks in the data array where 'delta' and/or 'value' doesn't change for 5 minutes or more
   * Skips breaks when the company is not working (surrounded by non-real values)
   * @param readings The LiveReading array to detect breaks in
   * @returns An array of detected breaks, each with a start and end timestamp and sensorId
   */
  private detectBreaks(readings: LiveReading[]): ProductionBreak[] {
    if (readings.length < 2) return [];

    // Use the shared detectBreaks function from @brado/types
    // Set groupBySensor to true to process each sensor's readings separately
    let breaks = detectBreaks(readings, this.BREAK_THRESHOLD_MINUTES, true);

    // Group readings by sensorId for filtering
    const readingsBySensor = this.groupBySensorId(readings);

    // Filter out breaks that are at the beginning or end of the working period
    // (surrounded by non-real values)
    return breaks.filter((breakItem) => {
      if (!breakItem.sensorId) return false;

      const sensorReadings = readingsBySensor[
        breakItem.sensorId.toString()
      ].sort((a, b) => +a.timestamp - +b.timestamp);
      const breakStartIndex = sensorReadings.findIndex(
        (r) => r.timestamp === breakItem.start,
      );
      const breakEndIndex = sensorReadings.findIndex(
        (r) => r.timestamp === breakItem.end,
      );

      // Check if there are real values before the break
      const hasRealValuesBefore = sensorReadings
        .slice(Math.max(0, breakStartIndex - 5), breakStartIndex)
        .some((r) => r.delta > 0);

      // Check if there are real values after the break
      const hasRealValuesAfter = sensorReadings
        .slice(breakEndIndex + 1, breakEndIndex + 6)
        .some((r) => r.delta > 0);

      // Only keep breaks that are surrounded by real values
      return hasRealValuesBefore && hasRealValuesAfter;
    });
  }

  async addReading(readings: [LiveReading]) {
    const currentTime = Date.now();

    // Check if we need to send a notification for no readings in the last 5 minutes
    if (this.lastReadingTime !== null) {
      const timeSinceLastReading = currentTime - this.lastReadingTime;

      if (
        timeSinceLastReading > this.NOTIFICATION_THRESHOLD_MS &&
        !this.hasNotifiedNoReadings
      ) {
        // No readings for more than 10 minutes and we haven't notified yet
        await this.notificationsService.broadcastAll({
          title: 'Brak odczytów',
          body: 'Nie otrzymano odcztytów przez 10 min.',
        });
        this.hasNotifiedNoReadings = true;
        this.hasNotifiedReadingsResumed = false;
      }
    }

    // If we're receiving readings again after a notification was sent
    if (this.hasNotifiedNoReadings && !this.hasNotifiedReadingsResumed) {
      await this.notificationsService.broadcastAll({
        title: 'Odczyty wznowione',
        body: 'Odczyty zostały wznowione po przerwie',
      });
      this.hasNotifiedReadingsResumed = true;
      this.hasNotifiedNoReadings = false;
    }

    // Update the last reading time
    this.lastReadingTime = currentTime;

    // Check for breaks in production
    this.checkForBreaks(readings);

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
      console.log('ERROR ON STORING LIVE READING');
      console.log(toSave);
      console.error(error);
      // throw error;
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
    // First, get all working periods to extract unique sensor IDs
    const allWorkingPeriods = await this.workPeriodsService.findLatest(
      WorkingPeriodType.LIVE,
    );

    // Extract unique sensor IDs from working periods
    const uniqueSensorIds = Array.from(
      new Set(allWorkingPeriods.map((wp) => wp.sensorId)),
    );

    // If no working periods found, use a fallback approach
    if (uniqueSensorIds.length === 0) {
      // Fallback: get readings from the last 24 hours
      const fallbackStartTime = Date.now() - 24 * 60 * 60 * 1000;

      const fallbackData = await this.liveReadingsRepo.find({
        where: {
          timestamp: MoreThan(fallbackStartTime.toString()),
        },
        order: { timestamp: 'ASC' },
      });

      if (fallbackData.length === 0) {
        return {};
      }

      // Extract unique sensor IDs from fallback data
      const fallbackSensorIds = Array.from(
        new Set(fallbackData.map((entity) => entity.sensorId)),
      );

      // Process fallback data
      return this.processLiveReadings(fallbackData, fallbackSensorIds, startOfTheDateTS);
    }

    // Initialize container for all readings
    let allReadings: LiveReading[] = [];

    // For each sensor, get its working periods and load readings
    for (const sensorId of uniqueSensorIds) {
      // Get working periods for this specific sensor
      const sensorWorkingPeriods = await this.workPeriodsService.findLatest(
        WorkingPeriodType.LIVE,
        sensorId.toString(),
      );

      if (sensorWorkingPeriods.length === 0) {
        continue; // Skip if no working periods for this sensor
      }

      // Get the start time for this sensor's readings
      const sensorStartTimes = sensorWorkingPeriods.map((p) => +p.start);
      const sensorStartTime = Math.min(...sensorStartTimes);

      // Load readings for this sensor
      const sensorReadings = await this.liveReadingsRepo.find({
        where: {
          sensorId,
          timestamp: MoreThan(sensorStartTime.toString()),
        },
        order: { timestamp: 'ASC' },
      });

      // Add to all readings
      allReadings = [...allReadings, ...sensorReadings];
    }

    if (allReadings.length === 0) {
      return {};
    }

    // Process all readings
    return this.processLiveReadings(allReadings, uniqueSensorIds, startOfTheDateTS);
  }

  // Helper method to process live readings
  private async processLiveReadings(
    readings: LiveReading[],
    sensorIds: number[],
    startOfTheDateTS: string,
  ): Promise<LiveUpdate> {
    const average60 = await this.getAverageSpeedsLastXMinutes(
      sensorIds,
      60,
    );

    const growingAverage = await this.getAverageIncreasing(startOfTheDateTS);

    const liveUpdate: LiveUpdate = {};

    sensorIds.forEach((id) => {
      const sensorReadings = readings.filter((reading) => reading.sensorId === id);

      if (sensorReadings.length === 0) {
        return; // Skip if no readings for this sensor
      }

      const todayWithTotal = this.attachRunningTotal(sensorReadings);

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

    // Array to store filtered readings for each sensor
    const filteredReadingsForAggregation: LiveReading[][] = [];

    // For each sensor, get the latest hourly reading and filter live readings
    for (const sensorID of uniqueSensorIds) {
      const latestHourlyReadings =
        await this.findLastHourlyBySensorId(+sensorID);
      const latestHourlyReading =
        latestHourlyReadings.length > 0 ? latestHourlyReadings[0] : null;

      // Filter live readings for this sensor
      const sensorReadings = liveReadings.filter(
        (reading) => reading.sensorId === +sensorID,
      );

      // If we have a latest hourly reading, only include readings that are newer
      if (latestHourlyReading) {
        const filteredReadings = sensorReadings.filter(
          (reading) => +reading.timestamp > +latestHourlyReading.timestamp,
        );

        if (filteredReadings.length > 0) {
          filteredReadingsForAggregation.push(filteredReadings);
        }
      } else {
        // If no hourly reading exists yet, include all readings for this sensor
        filteredReadingsForAggregation.push(sensorReadings);
      }
    }

    // Aggregate the filtered readings for each sensor
    const hourlyReadings = filteredReadingsForAggregation
      .map((readings) => ReadingsHelpers.aggregateToHourlyReadings(readings))
      .flat();

    // If no new hourly readings, return early
    if (hourlyReadings.length === 0) {
      return Promise.resolve('No new readings to aggregate');
    }

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

  async findLastHourlyBySensorId(sensorId: number): Promise<HourlyReading[]> {
    return this.hourlyReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .orderBy('reading.timestamp', 'DESC')
      .limit(1)
      .getMany();
  }

  async findLastNHourlyBySensorIdBeforeTs(
    sensorId: number,
    timestamp: string,
    n: number,
  ): Promise<HourlyReading[]> {
    return this.hourlyReadingsRepo
      .createQueryBuilder('reading')
      .where('reading.sensorId = :sensorId', { sensorId })
      .andWhere('reading.timestamp < :timestamp', { timestamp })
      .orderBy('reading.timestamp', 'DESC')
      .limit(n)
      .getMany();
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
      afterTimestamp?: string, // optional
  ): Promise<LiveReading[]> {
    const query = this.liveReadingsRepo
        .createQueryBuilder('reading')
        .where('reading.sensorId = :sensorId', { sensorId });

    if (afterTimestamp) {
      query.andWhere('reading.timestamp > :afterTimestamp', { afterTimestamp });
    }

    return query
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
      WorkingPeriodType.HOURLY,
    );

    const uniqueSensorIds = Array.from(
      new Set(hourlyReadings.map((entity) => entity.sensorId)),
    );

    const summaries: { [key: string]: DailyWorkingSummary } = {};

    uniqueSensorIds.forEach((sensorId) => {
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

    // Process each sensor separately
    for (const sensorId of uniqueSensorIds) {
      // Get working periods for this sensor and time range
      const workingPeriods = await this.workPeriodsService.getBetween(
        fromTS,
        toTS,
        WorkingPeriodType.HOURLY,
        sensorId.toString(),
      );

      // Sort working periods by start time
      workingPeriods.sort((a, b) => +a.start - +b.start);

      // Filter readings for this sensor and sort by timestamp
      const sensorReadings = readings
        .filter((r) => r.sensorId === sensorId)
        .sort((a, b) => +a.timestamp - +b.timestamp);

      if (sensorReadings.length === 0) continue;

      // If no working periods found, treat all readings as one period
      if (workingPeriods.length === 0) {
        let currentSum = 0;
        sensorReadings.forEach((r) => {
          currentSum += r.delta;
          r.dailyTotal = currentSum;
        });
        continue;
      }

      // Process readings by working period
      let currentWorkPeriodIndex = -1;
      let currentSum = 0;

      sensorReadings.forEach((reading) => {
        const readingTimestamp = +reading.timestamp;

        // Find which working period this reading belongs to
        let foundPeriod = false;
        for (let i = 0; i < workingPeriods.length; i++) {
          const period = workingPeriods[i];
          const periodStart = +period.start;
          const periodEnd = period.end ? +period.end : Infinity;

          if (
            readingTimestamp >= periodStart &&
            readingTimestamp <= periodEnd
          ) {
            // If we've moved to a new working period, reset the sum
            if (currentWorkPeriodIndex !== i) {
              currentWorkPeriodIndex = i;
              currentSum = 0;
            }
            foundPeriod = true;
            break;
          }
        }

        // If reading doesn't belong to any working period, check if it's before the first period
        if (!foundPeriod && workingPeriods.length > 0) {
          if (readingTimestamp < +workingPeriods[0].start) {
            // Before first period, use a special index
            if (currentWorkPeriodIndex !== -2) {
              currentWorkPeriodIndex = -2;
              currentSum = 0;
            }
          } else {
            // After all periods or between periods, find the closest previous period
            let closestPeriodIndex = -1;
            let closestDistance = Infinity;

            for (let i = 0; i < workingPeriods.length; i++) {
              const period = workingPeriods[i];
              const periodEnd = period.end ? +period.end : Infinity;

              if (readingTimestamp > periodEnd) {
                const distance = readingTimestamp - periodEnd;
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestPeriodIndex = i;
                }
              }
            }

            // If we found a closest period and it's different from current, reset sum
            if (
              closestPeriodIndex !== -1 &&
              currentWorkPeriodIndex !== closestPeriodIndex
            ) {
              currentWorkPeriodIndex = closestPeriodIndex;
              currentSum = 0;
            }
          }
        }

        // Update the running total for this working period
        currentSum += reading.delta;
        reading.dailyTotal = currentSum;
      });
    }

    return readings;
  }

  async exportData(
    fromTS: string,
    toTS: string,
    sensorId: number,
  ): Promise<Buffer> {
    const hourly = await this.hourlyReadingsRepo.find({
      where: {
        timestamp: Between(fromTS, toTS),
        sensorId: sensorId,
      },
      order: { timestamp: 'ASC' },
    });

    const workPeriods = await this.workPeriodsService.getBetween(
      fromTS,
      toTS,
      WorkingPeriodType.HOURLY,
      sensorId.toString(),
    );

    const annotations = await this.annotationService.getBetween(fromTS, toTS);

    const settings = await this.settingsService.getSettings();

    return exportToExcel(hourly, settings, annotations, workPeriods);
  }

  async exportRawData(
    fromTS: string,
    toTS: string,
    sensorId: string,
  ): Promise<Buffer> {
    const hourly = await this.hourlyReadingsRepo.find({
      where: {
        timestamp: Between(fromTS, toTS),
        sensorId: +sensorId,
      },
      order: { timestamp: 'ASC' },
    });

    return exportToExcelRAW(hourly);
  }

  async exportLiveData(sensorId: string): Promise<Buffer> {
    const newestWorkingPeriod = await this.workPeriodsService.findLatest(
      WorkingPeriodType.LIVE,
      sensorId,
    );

    let from, to;

    if (!newestWorkingPeriod.length) {
      const polandToday = TimeHelper.todayFromTo();
      from = polandToday.from;
      to = polandToday.to;
    } else {
      const workingPeriod = newestWorkingPeriod[0];
      from = workingPeriod.start;
      to = workingPeriod.end != null ? workingPeriod.end : new Date().getTime();
    }

    // Todo filter by sensorID?
    const annotations = await this.annotationService.getBetween(from, to);

    const liveReadings = await this.liveReadingsRepo.find({
      where: {
        sensorId: +sensorId,
        timestamp: Between(from, to),
      },
      order: { timestamp: 'ASC' },
    });

    const settings = await this.settingsService.getSettings();

    return exportToExcelLive(liveReadings, settings, annotations);
  }

  // async exportLiveDataOLD(fromTS: string): Promise<Buffer> {
  //   const liveData = await this.getInitialLiveData(fromTS);
  //   const settings = await this.settingsService.getSettings();
  //
  //   return exportToExcelLive(liveData, settings);
  // }

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

  async createOrUpdateHourlyReading(
    reading: HourlyReading,
  ): Promise<HourlyReading> {
    let readingToSave = reading;
    let existing: null | HourlyReading = null;

    if (reading.id) {
      // Try to find existing entity by ID
      existing = await this.hourlyReadingsRepo.findOne({
        where: { id: reading.id },
      });

      if (existing) {
        // Merge and update
        readingToSave = this.hourlyReadingsRepo.merge(existing, reading);
      }
    }

    // Recalculate delta value for current reading
    // Find the previous reading for this sensor (the one before the current timestamp)
    const previousReadings = await this.findLastNHourlyBySensorIdBeforeTs(
      reading.sensorId,
      reading.timestamp,
      1,
    );
    let previousReading: HourlyReading | undefined;

    // Get the previous reading if available
    if (previousReadings.length > 0) {
      previousReading = previousReadings[0];
    }

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
    const created = this.hourlyReadingsRepo.create(readingToSave);
    await this.hourlyReadingsRepo.save(created);

    // Find the next reading after this one to update its delta
    const nextReadings = await this.hourlyReadingsRepo.find({
      where: {
        sensorId: reading.sensorId,
        timestamp: MoreThan(reading.timestamp),
      },
      order: { timestamp: 'ASC' },
      take: 1,
    });

    const nextReading = nextReadings.length > 0 ? nextReadings[0] : null;

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
        await this.hourlyReadingsRepo.save(nextReading);
      }
    }

    return created;
  }

  async delete(readingIds: string[]) {
    if (!readingIds || readingIds.length === 0) {
      throw new Error('No reading IDs provided for deletion.');
    }

    await this.liveReadingsRepo.delete(readingIds);
    return `Deleted ${readingIds.length} reading(s) successfully.`;
  }

  async importCsvData(sensorID: string, csvData: string) {
    // Parse CSV data (assuming format: date,value)
    const rows = csvData.trim().split('\n');

    // Skip header row if present
    const startIndex =
      rows[0].includes('Czas') && rows[0].includes('Wartość') ? 1 : 0;

    // Process each row
    const parsedReadings: Partial<HourlyReading>[] = [];
    for (let i = startIndex; i < rows.length; i++) {
      const [dateStr, valueStr] = rows[i].split(',');
      if (!dateStr || !valueStr) continue;

      // Parse value
      const value = parseInt(valueStr.trim(), 10);
      if (isNaN(value)) continue;

      // Convert date string to timestamp (Polish timezone)
      // Format: DD.MM.YYYY HH:mm
      const [datePart, timePart] = dateStr.trim().split(' ');
      if (!datePart || !timePart) continue;

      const [day, month, year] = datePart.split('.');
      const [hour, minute] = timePart.split(':');

      // Create DateTime object in Polish timezone
      const dt = DateTime.fromObject(
        {
          day: parseInt(day, 10),
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          hour: parseInt(hour, 10),
          minute: parseInt(minute, 10),
        },
        { zone: 'Europe/Warsaw' },
      );

      if (!dt.isValid) continue;

      // Convert to timestamp
      const timestamp = dt.toMillis().toString();

      parsedReadings.push({
        sensorId: +sensorID,
        value,
        timestamp,
        workStartTime: (+timestamp - 3600000).toString(),
        workEndTime: timestamp,
      });
    }

    if (parsedReadings.length === 0) {
      return {
        updated: 0,
        added: 0,
        message: 'No valid readings found in CSV',
      };
    }

    // // Find existing readings for this sensor within the time range
    const minTimestamp = Math.min(
      ...parsedReadings
        .filter((r) => r.timestamp != null)
        .map((r) => +(r as HourlyReading).timestamp),
    );
    const maxTimestamp = Math.max(
      ...parsedReadings
        .filter((r) => r.timestamp != null)
        .map((r) => +(r as HourlyReading).timestamp),
    );

    const existingReadings = await this.hourlyReadingsRepo.find({
      where: {
        sensorId: +sensorID,
        timestamp: Between(minTimestamp.toString(), maxTimestamp.toString()),
      },
    });
    //
    // Create a map of existing readings by timestamp for easy lookup
    const existingReadingsMap = new Map();
    existingReadings.forEach((reading) => {
      existingReadingsMap.set(reading.timestamp, reading);
    });
    //
    // // Process each reading from CSV
    let updatedCount = 0;
    let addedCount = 0;
    //
    for (const reading of parsedReadings) {
      const existingReading = existingReadingsMap.get(reading.timestamp);

      if (existingReading) {
        // Reading exists - check if value has changed
        if (existingReading.value !== reading.value) {
          // Update the reading

          await this.createOrUpdateHourlyReading({
            ...existingReading,
            value: reading.value,
            workStartTime: reading.workStartTime,
            workEndTime: reading.workEndTime,
          });
          updatedCount++;
        }
        // If value is the same, do nothing
      } else {
        // This is a new reading - add it
        await this.createOrUpdateHourlyReading(reading as HourlyReading);
        addedCount++;
      }
    }

    return {
      updated: updatedCount,
      added: addedCount,
      message: `Processed ${parsedReadings.length} readings: ${updatedCount} updated, ${addedCount} added`,
    };
  }

  // Methods for working period detection
  async getUniqueLiveSensorIds(): Promise<{ sensorId: number }[]> {
    return this.liveReadingsRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.sensorId', 'sensorId')
      .getRawMany();
  }

  async getUniqueHourlySensorIds(): Promise<{ sensorId: number }[]> {
    return this.hourlyReadingsRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.sensorId', 'sensorId')
      .getRawMany();
  }

  async getLiveReadingsBySensorId(sensorId: number): Promise<LiveReading[]> {
    return this.liveReadingsRepo.find({
      where: { sensorId },
      order: { timestamp: 'ASC' },
    });
  }

  async getHourlyReadingsBySensorId(
    sensorId: number,
  ): Promise<HourlyReading[]> {
    return this.hourlyReadingsRepo.find({
      where: { sensorId },
      order: { timestamp: 'ASC' },
    });
  }
}
