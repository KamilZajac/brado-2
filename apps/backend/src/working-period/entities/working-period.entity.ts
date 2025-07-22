import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WorkingPeriodType } from '@brado/types';

@Entity('working_period')
export class WorkingPeriodEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sensorId: number;

  @Column('bigint')
  start: string;

  @Column({ type: 'bigint', nullable: true })
  end: string | null;

  @Column({ default: false })
  isManuallyCorrected: boolean;

  @Column({
    type: 'enum',
    enum: WorkingPeriodType,
    default: WorkingPeriodType.LIVE
  })
  type: WorkingPeriodType;
}
