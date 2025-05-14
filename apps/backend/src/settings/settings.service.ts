import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
  ) {}

  async saveSettings(data: {
    hourlyTarget: number;
    dailyTarget: number;
    sensors: string[];
  }): Promise<SettingsEntity> {
    const { hourlyTarget, dailyTarget, sensors } = data;

    // Utwórz lub zaktualizuj ustawienia
    const settings = this.settingsRepository.create({
      hourlyTarget,
      dailyTarget,
      sensorNames: sensors, // Przechowywanie tablicy nazw sensorów
    });

    return await this.settingsRepository.save(settings); // Zapis do bazy danych
  }

  async getSettings() {
    const settings = await this.settingsRepository.find({
      take: 1, // or any other field
    });

    return settings[0] || null;
  }
}
