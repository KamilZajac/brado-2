import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
