import { Entity, Unique } from 'typeorm';
import {BaseReading} from "./base-reading";

@Entity("live_reading")
@Unique(['sensorId', 'timestamp'])
export class LiveReadingEntity extends BaseReading {}
