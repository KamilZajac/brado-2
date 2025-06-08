import { PartialType } from '@nestjs/mapped-types';
import { CreateTemperatureDto } from './create-temperature.dto';

export class UpdateTemperatureDto extends PartialType(CreateTemperatureDto) {}
