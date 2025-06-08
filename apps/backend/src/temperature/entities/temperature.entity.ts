import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('temperature_reading')
export class TemperatureEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sensorId: string;

  @Column('float')
  temperature: number;

  @Column('float')
  humidity: number;

  @Column('float')
  dewPoint: number;

  @Column('bigint')
  timestamp: string;
}
