import { Column, Entity, Unique } from 'typeorm';
import { BaseReading } from './base-reading';

@Entity('hourly_reading')
@Unique(['sensorId', 'timestamp'])
export class HourlyReadingEntity extends BaseReading {
  @Column({ type: 'int' })
  min: number;

  @Column({ type: 'int' })
  max: number;

  @Column({ type: 'float' })
  average: number;

  @Column({ type: 'bigint', nullable: true })
  workStartTime: string;

  @Column({ type: 'bigint', nullable: true })
  workEndTime: string;
}
