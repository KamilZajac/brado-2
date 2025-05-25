import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsEntity } from './entities/setting.entity';
import { SettingsRequest } from '@brado/types';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  async saveSettings(
    @Body()
    body: SettingsRequest,
  ): Promise<SettingsEntity> {
    return this.settingsService.saveSettings(body);
  }

  @Get()
  async getSettings(): Promise<SettingsEntity | null> {
    console.log(await this.settingsService.getSettings());
    return this.settingsService.getSettings();
  }
}
