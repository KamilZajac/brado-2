import { WorkingPeriodType } from '@brado/types';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkingPeriodEntity } from './entities/working-period.entity';
import { ReadingService } from '../reading/reading.service';

@Injectable()
export class WorkingPeriodService {
  private readonly logger = new Logger(WorkingPeriodService.name);

  constructor(
    @InjectRepository(WorkingPeriodEntity)
    private periodRepo: Repository<WorkingPeriodEntity>,
    @Inject(forwardRef(() => ReadingService))
    private readingService: ReadingService,
  ) {}

  async detectWorkingPeriods(): Promise<void> {
    await this.detectLiveWorkingPeriods();
    await this.detectHourlyWorkingPeriods();
  }

  async detectLiveWorkingPeriods(): Promise<void> {
    // Get all unique sensor IDs
    const sensorIds = await this.readingService.getUniqueLiveSensorIds();

    // Define constants
    const BREAK_MAX_MS = 4 * 60 * 60 * 1000; // 4 hours - breaks shorter than this are not counted as end of workday
    const ACTIVITY_THRESHOLD = 10; // Delta values below this are considered inactive

    for (const row of sensorIds) {
      const sensorId = row.sensorId;

      // Get all readings for this sensor, ordered by timestamp
      const readings =
        await this.readingService.getLiveReadingsBySensorId(sensorId);

      if (readings.length === 0) {
        continue;
      }

      // Delete existing non-manually corrected live working periods for this sensor
      await this.periodRepo.delete({
        sensorId,
        isManuallyCorrected: false,
        type: WorkingPeriodType.LIVE,
      });

      let currentPeriod: {
        start: string;
        end: string | null;
        lastActiveTimestamp: string;
      } | null = null;

      // Process readings to detect working periods
      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        const isActive = reading.delta > ACTIVITY_THRESHOLD;
        const currentTimeMs = parseInt(reading.timestamp);

        // Start a new period if we detect activity and don't have an active period
        if (isActive && !currentPeriod) {

          currentPeriod = {
            start: reading.timestamp,
            end: null,
            lastActiveTimestamp: reading.timestamp,
          };
        }
        // Update last activity time if we have an active period and current reading is active
        else if (isActive && currentPeriod) {
          currentPeriod.lastActiveTimestamp = reading.timestamp;
          // If the period was previously ended, reopen it
          if (currentPeriod.end !== null) {
            currentPeriod.end = null;
          }
        }
        // Check if we should end the period due to inactivity
        else if (!isActive && currentPeriod) {
          const lastActiveTimeMs = parseInt(currentPeriod.lastActiveTimestamp);
          const inactivityDuration = currentTimeMs - lastActiveTimeMs;

          // Only end the period if inactivity exceeds the maximum break time
          if (inactivityDuration > BREAK_MAX_MS) {

            currentPeriod.end = currentPeriod.lastActiveTimestamp;

            // Save the completed period
            await this.periodRepo.save(
              this.periodRepo.create({
                sensorId,
                start: currentPeriod.start,
                end: currentPeriod.end,
                type: WorkingPeriodType.LIVE,
              }),
            );

            // Reset current period
            currentPeriod = null;
          }
        }

        // Check for missing data - if there's a significant gap between current reading and next readings
        if (
          currentPeriod &&
          currentPeriod.end === null &&
          i < readings.length - 1
        ) {
          const nextReadingTimeMs = parseInt(readings[i + 1].timestamp);
          const timeDifference = nextReadingTimeMs - currentTimeMs;

          // If there's a significant gap (more than our threshold)
          if (timeDifference > BREAK_MAX_MS) {
            // Check if there's any data in the next two hours after the current reading
            let hasDataInNextTwoHours = false;
            const twoHoursInMs = 2 * 60 * 60 * 1000;
            const timeWindowEnd = currentTimeMs + twoHoursInMs;

            // Look ahead to see if there's any data in the next two hours
            for (let j = i + 1; j < readings.length; j++) {
              const futureReadingTimeMs = parseInt(readings[j].timestamp);
              if (futureReadingTimeMs <= timeWindowEnd) {
                hasDataInNextTwoHours = true;
                break;
              }
            }

            // If no data in next two hours, end the working period
            if (!hasDataInNextTwoHours) {


              currentPeriod.end = reading.timestamp;

              // Save the completed period
              await this.periodRepo.save(
                this.periodRepo.create({
                  sensorId,
                  start: currentPeriod.start,
                  end: currentPeriod.end,
                  type: WorkingPeriodType.LIVE,
                }),
              );

              // Reset current period
              currentPeriod = null;
            }
          }
        }

        // If this is the last reading and we have an open period, close it
        if (
          i === readings.length - 1 &&
          currentPeriod &&
          currentPeriod.end === null
        ) {


          await this.periodRepo.save(
            this.periodRepo.create({
              sensorId,
              start: currentPeriod.start,
              end: currentPeriod.lastActiveTimestamp,
              type: WorkingPeriodType.LIVE,
            }),
          );
        }
      }
    }

  }

  async detectHourlyWorkingPeriods(): Promise<void> {
    // Get all unique sensor IDs
    const sensorIds = await this.readingService.getUniqueHourlySensorIds();

    // Define constants
    const BREAK_MAX_MS = 2 * 60 * 60 * 1000; // 2 hours - breaks shorter than this are not counted as end of workday
    const ACTIVITY_THRESHOLD = 10; // Delta values below this are considered inactive

    for (const row of sensorIds) {
      const sensorId = row.sensorId;

      // Get all readings for this sensor, ordered by timestamp
      const readings =
        await this.readingService.getHourlyReadingsBySensorId(sensorId);

      // console.log(readings.filter(s => s.sensorId === 1 && +s.timestamp >= 1751320800000))

      if (readings.length === 0) {
        continue;
      }

      // Delete existing non-manually corrected hourly working periods for this sensor
      await this.periodRepo.delete({
        sensorId,
        isManuallyCorrected: false,
        type: WorkingPeriodType.HOURLY,
      });

      let currentPeriod: {
        start: string;
        end: string | null;
        lastActiveTimestamp: string;
      } | null = null;

      // Process readings to detect working periods
      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        const isActive = reading.delta > ACTIVITY_THRESHOLD;
        const currentTimeMs = parseInt(reading.timestamp);

        // Start a new period if we detect activity and don't have an active period
        if (isActive && !currentPeriod) {
          currentPeriod = {
            start: reading.timestamp,
            end: null,
            lastActiveTimestamp: reading.timestamp,
          };
        }
        // Update last activity time if we have an active period and current reading is active
        else if (isActive && currentPeriod) {
          currentPeriod.lastActiveTimestamp = reading.timestamp;
          // If the period was previously ended, reopen it
          if (currentPeriod.end !== null) {
            currentPeriod.end = null;
          }
        }
        // Check if we should end the period due to inactivity
        else if (!isActive && currentPeriod) {
          const lastActiveTimeMs = parseInt(currentPeriod.lastActiveTimestamp);
          const inactivityDuration = currentTimeMs - lastActiveTimeMs;

          // Only end the period if inactivity exceeds the maximum break time
          if (inactivityDuration > BREAK_MAX_MS) {
            currentPeriod.end = currentPeriod.lastActiveTimestamp;

            // Save the completed period
            await this.periodRepo.save(
              this.periodRepo.create({
                sensorId,
                start: currentPeriod.start,
                end: currentPeriod.end,
                type: WorkingPeriodType.HOURLY,
              }),
            );

            // Reset current period
            currentPeriod = null;
          }
        }

        // Check for missing data - if there's a significant gap between current reading and next readings
        if (
          currentPeriod &&
          currentPeriod.end === null &&
          i < readings.length - 1
        ) {
          const nextReadingTimeMs = parseInt(readings[i + 1].timestamp);
          const timeDifference = nextReadingTimeMs - currentTimeMs;

          // If there's a significant gap (more than our threshold)
          if (timeDifference > BREAK_MAX_MS) {
            // Check if there's any data in the next two hours after the current reading
            let hasDataInNextTwoHours = false;
            const twoHoursInMs = 2 * 60 * 60 * 1000;
            const timeWindowEnd = currentTimeMs + twoHoursInMs;

            // Look ahead to see if there's any data in the next two hours
            for (let j = i + 1; j < readings.length; j++) {
              const futureReadingTimeMs = parseInt(readings[j].timestamp);
              if (futureReadingTimeMs <= timeWindowEnd) {
                hasDataInNextTwoHours = true;
                break;
              }
            }

            // If no data in next two hours, end the working period
            if (!hasDataInNextTwoHours) {

              currentPeriod.end = reading.timestamp;

              // Save the completed period
              await this.periodRepo.save(
                this.periodRepo.create({
                  sensorId,
                  start: currentPeriod.start,
                  end: currentPeriod.end,
                  type: WorkingPeriodType.HOURLY,
                }),
              );

              // Reset current period
              currentPeriod = null;
            }
          }
        }

        // If this is the last reading and we have an open period, close it
        if (
          i === readings.length - 1 &&
          currentPeriod &&
          currentPeriod.end === null
        ) {

          await this.periodRepo.save(
            this.periodRepo.create({
              sensorId,
              start: currentPeriod.start,
              end: currentPeriod.lastActiveTimestamp,
              type: WorkingPeriodType.HOURLY,
            }),
          );
        }
      }
    }
  }

  async getBetween(
    fromTS: string,
    toTS: string,
    type?: WorkingPeriodType,
    sensorId?: string
  ): Promise<WorkingPeriodEntity[]> {
    const whereConditions = [
      {
        start: Between(fromTS, toTS), // Period starts and fits within the range
      },
      {
        end: Between(fromTS, toTS), // Period ends and fits within the range
      },
      {
        start: LessThanOrEqual(fromTS), // Period starts before the range but ends during it
        end: MoreThanOrEqual(toTS),
      },
    ];

    if (type) {
      // Add type condition to each where clause
      whereConditions.forEach((condition) => {
        condition['type'] = type;
      });
    }
    if (sensorId) {
      // Add type condition to each where clause
      whereConditions.forEach((condition) => {
        condition['sensorId'] = sensorId;
      });
    }

    return this.periodRepo.find({
      where: whereConditions,
    });
  }

  async findLatest(
    type?: WorkingPeriodType,
    sensorId?: string,
  ): Promise<WorkingPeriodEntity[]> {
    // Step 1: Get max start per sensorId (and type if specified)
    let queryBuilder = this.periodRepo
      .createQueryBuilder('wp')
      .select('wp.sensorId', 'sensorId');

    if (type) {
      queryBuilder = queryBuilder
        .andWhere('wp.type = :type', { type })
        .addSelect('wp.type', 'type');
    }

    if (sensorId) {
      queryBuilder = queryBuilder
          .andWhere('wp.sensorId = :sensorId', { sensorId: sensorId })
          .addSelect('wp.sensorId', 'sensorId');
    }


    queryBuilder = queryBuilder
      .addSelect('MAX(wp.start)', 'maxStart')
      .groupBy('wp.sensorId');

    if (type) {
      queryBuilder = queryBuilder.addGroupBy('wp.type');
    }

    const sensors = await queryBuilder.getRawMany();

    // Step 2: Fetch full entities by sensorId + start (+ type if specified)
    const results: WorkingPeriodEntity[] = [];

    for (const { sensorId, maxStart, type: rowType } of sensors) {
      const whereCondition: any = {
        sensorId: Number(sensorId),
        start: maxStart,
      };

      if (type) {
        whereCondition.type = rowType || type;
      }

      const entity = await this.periodRepo.findOneBy(whereCondition);
      if (entity) {
        results.push(entity);
      }
    }

    return results;
  }

  /**
   * Get all working periods
   */
  async getAll(type?: WorkingPeriodType): Promise<WorkingPeriodEntity[]> {
    if (type) {
      return this.periodRepo.find({
        where: { type },
      });
    }
    return this.periodRepo.find();
  }

  /**
   * Get working periods for a specific sensor
   */
  async getBySensorId(
    sensorId: number,
    type?: WorkingPeriodType,
  ): Promise<WorkingPeriodEntity[]> {
    const whereCondition: any = { sensorId };

    if (type) {
      whereCondition.type = type;
    }

    return this.periodRepo.find({
      where: whereCondition,
      order: { start: 'ASC' },
    });
  }

  /**
   * Manually trigger the working period detection process
   */
  async manualDetection(): Promise<void> {
    return this.detectWorkingPeriods();
  }

  /**
   * Manually trigger the live working period detection process
   */
  async manualLiveDetection(): Promise<void> {
    return this.detectLiveWorkingPeriods();
  }

  /**
   * Manually trigger the hourly working period detection process
   */
  async manualHourlyDetection(): Promise<void> {
    return this.detectHourlyWorkingPeriods();
  }
}
