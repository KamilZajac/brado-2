// src/push/dto/subscribe.dto.ts
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsObject() subscription!: any; // shape from Push API
  @IsOptional() @IsString() ua?: string;
  @IsOptional() @IsString() appVersion?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() platform?: string;
}

export class UnsubscribeDto {
  @IsString() endpoint!: string;
}

export class BroadcastDto {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() url?: string; // opened on click
}
