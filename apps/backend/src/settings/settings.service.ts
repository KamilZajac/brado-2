import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from './entities/setting.entity';
import { SettingsRequest } from '@brado/types';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
  ) {}

  async saveSettings(data: SettingsRequest): Promise<SettingsEntity> {
    let settings = await this.settingsRepository.findOneBy({ id: 1 }); // Znajdź rekord z id = 1

    if (!settings) {
      settings = this.settingsRepository.create({
        id: 1,
        hourlyTarget: 0,
        sensorNames: [],
      });
    }

    settings.hourlyTarget = data.hourlyTarget;
    settings.sensorNames = data.sensorNames;

    return this.settingsRepository.save(settings);
  }

  async getSettings() {
    const settings = await this.settingsRepository.find({
      take: 1,
    });

    return settings[0] || null;
  }
}
