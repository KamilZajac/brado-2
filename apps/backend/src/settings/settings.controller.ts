import { Controller, Get, Post , Body} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsEntity } from './entities/setting.entity';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  async saveSettings(
    @Body()
    body: {
      hourlyTarget: number;
      dailyTarget: number;
      sensors: string[];
    },
  ): Promise<SettingsEntity> {
    return this.settingsService.saveSettings(body);
  }

  @Get()
  async getSettings(): Promise<SettingsEntity | null> {
    // Pobierz aktualne ustawienia (załóżmy, że jest tylko jeden zestaw ustawień w tabeli)
    console.log(await this.settingsService.getSettings())
    return this.settingsService.getSettings();
  }

}
