import { LiveReadingEntity } from '../reading/entities/minute-reading.entity';
import { HourlyReading, LiveReading } from '@brado/types';
import { HourlyReadingEntity } from '../reading/entities/hourly-reading-entity';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkingPeriodEntity } from './entities/working-period.entity';
import { Cron } from '@nestjs/schedule';
import { AnnotationEntity } from '../annotation/entities/annotation.entity';

@Injectable()
export class WorkingPeriodService {
  private readonly logger = new Logger(WorkingPeriodService.name);

  constructor(
    @InjectRepository(LiveReadingEntity)
    private liveReadingsRepo: Repository<LiveReading>,
    @InjectRepository(HourlyReadingEntity)
    private hourlyReadingsRepo: Repository<HourlyReading>,
    @InjectRepository(WorkingPeriodEntity)
    private periodRepo: Repository<WorkingPeriodEntity>,
  ) {}

  async detectWorkingPeriods(): Promise<void> {
    this.logger.log('Detecting working periods');
    //  Todo remove repo
    // Todo use that for hourly?
    // Get all unique sensor IDs
    const sensorIds = await this.liveReadingsRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.sensorId', 'sensorId')
      .getRawMany();

    // Define constants
    const BREAK_MAX_MS = 2 * 60 * 60 * 1000; // 2 hours - breaks shorter than this are not counted as end of workday
    const ACTIVITY_THRESHOLD = 10; // Delta values below this are considered inactive

    for (const row of sensorIds) {
      const sensorId = row.sensorId;
      this.logger.debug(`Processing sensor ${sensorId}`);

      // Get all readings for this sensor, ordered by timestamp
      const readings = await this.liveReadingsRepo.find({
        where: { sensorId },
        order: { timestamp: 'ASC' },
      });

      if (readings.length === 0) {
        this.logger.debug(`No readings found for sensor ${sensorId}`);
        continue;
      }

      // Delete existing non-manually corrected working periods for this sensor
      await this.periodRepo.delete({
        sensorId,
        isManuallyCorrected: false,
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
          this.logger.debug(
            `Starting new working period for sensor ${sensorId} at ${new Date(currentTimeMs).toISOString()}`,
          );
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
            this.logger.debug(
              `Reopening working period for sensor ${sensorId}`,
            );
            currentPeriod.end = null;
          }
        }
        // Check if we should end the period due to inactivity
        else if (!isActive && currentPeriod) {
          const lastActiveTimeMs = parseInt(currentPeriod.lastActiveTimestamp);
          const inactivityDuration = currentTimeMs - lastActiveTimeMs;

          // Only end the period if inactivity exceeds the maximum break time
          if (inactivityDuration > BREAK_MAX_MS) {
            this.logger.debug(
              `Ending working period for sensor ${sensorId} at ${new Date(lastActiveTimeMs).toISOString()} due to ${inactivityDuration / 60000} minutes of inactivity`,
            );
            currentPeriod.end = currentPeriod.lastActiveTimestamp;

            // Save the completed period
            await this.periodRepo.save(
              this.periodRepo.create({
                sensorId,
                start: currentPeriod.start,
                end: currentPeriod.end,
              }),
            );

            // Reset current period
            currentPeriod = null;
          }
        }

        // If this is the last reading and we have an open period, close it
        if (
          i === readings.length - 1 &&
          currentPeriod &&
          currentPeriod.end === null
        ) {
          this.logger.debug(
            `Closing final working period for sensor ${sensorId} at ${new Date(parseInt(currentPeriod.lastActiveTimestamp)).toISOString()}`,
          );

          await this.periodRepo.save(
            this.periodRepo.create({
              sensorId,
              start: currentPeriod.start,
              end: currentPeriod.lastActiveTimestamp,
            }),
          );
        }
      }
    }

    this.logger.log('Working period detection completed');
  }

  async getBetween(
    fromTS: string,
    toTS: string,
  ): Promise<WorkingPeriodEntity[]> {
    return this.periodRepo.find({
      where: [
        {
          start: Between(fromTS, toTS), // Okres zaczyna się i mieści w zakresie
        },
        {
          end: Between(fromTS, toTS), // Okres kończy się i mieści w zakresie
        },
        {
          start: LessThanOrEqual(fromTS), // Okres zaczyna się przed okresem, ale kończy w jego trakcie
          end: MoreThanOrEqual(toTS),
        },
      ],
    });
  }

  async findLatest(): Promise<WorkingPeriodEntity[]> {
    // Step 1: Get max start per sensorId
    const sensors = await this.periodRepo
      .createQueryBuilder('wp')
      .select('wp.sensorId', 'sensorId')
      .addSelect('MAX(wp.start)', 'maxStart')
      .groupBy('wp.sensorId')
      .getRawMany();

    // Step 2: Fetch full entities by sensorId + start
    const results: WorkingPeriodEntity[] = [];

    for (const { sensorId, maxStart } of sensors) {
      const entity = await this.periodRepo.findOneBy({
        sensorId: Number(sensorId),
        start: maxStart,
      });
      if (entity) {
        results.push(entity);
      }
    }

    return results
  }

  /**
   * Get all working periods
   */
  async getAll(): Promise<WorkingPeriodEntity[]> {
    return this.periodRepo.find();
  }

  /**
   * Get working periods for a specific sensor
   */
  async getBySensorId(sensorId: number): Promise<WorkingPeriodEntity[]> {
    return this.periodRepo.find({
      where: { sensorId },
      order: { start: 'ASC' },
    });
  }

  /**
   * Manually trigger the working period detection process
   */
  async manualDetection(): Promise<void> {
    this.logger.log('Manually triggering working period detection');
    return this.detectWorkingPeriods();
  }
}
