import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TempReading } from '@brado/types';
import { TemperatureEntity } from './entities/temperature.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { ReadingsGateway } from '../reading/readings.gateway';
import * as ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { MailService } from '../mail/mail.service';
import {NotificationsService} from "../notifications/notifications.service";

@Injectable()
export class TemperatureService {
  // Map to track sensors with temperatures above threshold
  private sensorTemperatureAlerts: Map<
    string,
    { timestamp: number; notified: boolean }
  > = new Map();

  // Temperature threshold (-15°C)
  private readonly TEMPERATURE_THRESHOLD = -15;

  // Duration threshold (5 minutes in milliseconds)
  private readonly DURATION_THRESHOLD_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(TemperatureEntity)
    private tempReadingsRepo: Repository<TemperatureEntity>,
    private readonly gateway: ReadingsGateway,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => NotificationsService))
    private pushService: NotificationsService
  ) {}

  async addReading(data: TempReading[]) {
    const date = new Date().toISOString();
    console.log(date + ' Received temperature reading - ' + data.length);
    const toSave = this.tempReadingsRepo.create(data);
    try {
      await this.tempReadingsRepo.save(toSave);
      this.gateway.sendLifeTempUpdate(toSave);

      // Process temperature alerts for sensors with 'szok' in their name
      this.processSensorTemperatureAlerts(toSave);

      console.log(date + 'Saved and processed');
      return 'ok';
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process temperature readings to detect and alert on temperature conditions
   * for sensors with 'szok' in their name that have temperatures above threshold
   * for at least 5 minutes
   */
  private processSensorTemperatureAlerts(readings: TemperatureEntity[]) {
    const currentTime = Date.now();

    // Filter readings for sensors with 'szok' in their name
    const szokSensorReadings = readings.filter((reading) =>
      reading.sensorId.toLowerCase().includes('szok'),
    );

    // Process each reading from relevant sensors
    for (const reading of szokSensorReadings) {
      const sensorId = reading.sensorId;
      const temperature = reading.temperature;

      // Check if temperature is above the threshold
      if (temperature > this.TEMPERATURE_THRESHOLD) {
        // If this sensor is not already being tracked, start tracking it
        if (!this.sensorTemperatureAlerts.has(sensorId)) {
          this.sensorTemperatureAlerts.set(sensorId, {
            timestamp: currentTime,
            notified: false,
          });
        }

        // Get the current alert state for this sensor
        const alertState = this.sensorTemperatureAlerts.get(sensorId);

        // Check if the condition has persisted for at least 5 minutes and notification hasn't been sent
        if (
          alertState &&
          !alertState.notified &&
          currentTime - alertState.timestamp >= this.DURATION_THRESHOLD_MS
        ) {
          // Send email notification
          this.sendTemperatureAlert(sensorId, temperature);

          // Mark as notified to prevent duplicate emails
          this.sensorTemperatureAlerts.set(sensorId, {
            ...alertState,
            notified: true,
          });
        }
      } else {
        // Temperature is below or equal to threshold, reset tracking for this sensor
        this.sensorTemperatureAlerts.delete(sensorId);
      }
    }
  }

  /**
   * Send an email alert about a sensor's temperature condition
   */
  private sendTemperatureAlert(sensorId: string, temperature: number) {
    // push
    this.pushService.broadcastAll({
      title: 'Alert Temperatury: Czujnik ${sensorId}',
      body: 'Obecna Temperatura: ${temperature}°C'
    })

    // email
    const subject = `Alert Temperatury: Czujnik ${sensorId}`;
    const text = `
      Alert
      -----------------
      Sensor: ${sensorId}
      Obecna Temperatura: ${temperature}°C
      Margines: ${this.TEMPERATURE_THRESHOLD}°C

      Temperatura: ${sensorId} jest powyżej ${this.TEMPERATURE_THRESHOLD}°C 
      przez przynajmniej 5 minut.

    `;

    this.mailService.sendMail({
      subject,
      text,
    });
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
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 7);

    return await this.tempReadingsRepo.delete({
      timestamp: LessThan(fourWeeksAgo.getTime().toString()),
    });
  }

  async exportAllTemps(): Promise<Buffer> {
    // Get all temperature readings
    const readings = await this.tempReadingsRepo.find({
      order: { sensorId: 'ASC', timestamp: 'ASC' },
    });

    // Group readings by sensorId
    const groupedBySensor = {};
    readings.forEach((reading) => {
      if (!groupedBySensor[reading.sensorId]) {
        groupedBySensor[reading.sensorId] = [];
      }
      groupedBySensor[reading.sensorId].push(reading);
    });

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Create a worksheet for each sensorId
    Object.keys(groupedBySensor).forEach((sensorId) => {
      const sensorReadings = groupedBySensor[sensorId];
      const worksheet = workbook.addWorksheet(`Sensor ${sensorId}`);

      // Define columns with Polish headers as specified
      worksheet.columns = [
        { header: 'Data', key: 'date', width: 20 },
        { header: 'Temperatura', key: 'temperature', width: 15 },
        { header: 'Wilgotność', key: 'humidity', width: 15 },
        { header: 'Punkt rosy', key: 'dewPoint', width: 15 },
      ];

      // Add data rows
      sensorReadings.forEach((reading) => {
        // Format timestamp to readable date
        const formattedDate = DateTime.fromMillis(+reading.timestamp, {
          zone: 'Europe/Warsaw',
        }).toFormat('dd.MM.yyyy HH:mm:ss');

        worksheet.addRow({
          date: formattedDate,
          temperature: reading.temperature,
          humidity: reading.humidity,
          dewPoint: reading.dewPoint,
        });
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
    });

    // Generate the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportTemp(tempID: string): Promise<Buffer> {
    // Query all temperature readings with the specified sensorId
    const readings = await this.tempReadingsRepo.find({
      where: {
        sensorId: tempID,
      },
      order: { timestamp: 'ASC' },
    });

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Temperature Readings');

    // Define columns with Polish headers as specified
    worksheet.columns = [
      { header: 'Data', key: 'date', width: 20 },
      { header: 'Temperatura', key: 'temperature', width: 15 },
      { header: 'Wilgotność', key: 'humidity', width: 15 },
      { header: 'Punkt rosy', key: 'dewPoint', width: 15 },
    ];

    // Add data rows
    readings.forEach((reading) => {
      // Format timestamp to readable date
      const formattedDate = DateTime.fromMillis(+reading.timestamp, {
        zone: 'Europe/Warsaw',
      }).toFormat('dd.MM.yyyy HH:mm:ss');

      worksheet.addRow({
        date: formattedDate,
        temperature: reading.temperature,
        humidity: reading.humidity,
        dewPoint: reading.dewPoint,
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };

    // Generate the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  testEmail() {
    this.mailService.sendMail({
      subject: 'Test email',
      text: 'This is a test email',
    });
  }

  async exportAllTempsAndSend() {
    const buffer = await this.exportAllTemps();

    return this.mailService.sendMail({
      subject: 'Tygodniowy eksport temperatur',
      text: 'Eksport wszystkich sensorów',
      attachments: [
        {
          filename: 'Eksport temperatur.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: buffer,
        },
      ],
    });
  }
}
