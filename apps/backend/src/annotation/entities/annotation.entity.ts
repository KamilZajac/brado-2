import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from '../../users/entities/users.entity';

@Entity('annotation')
export class AnnotationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  @Column()
  sensorId: number;

  @Column('integer')
  value: number;

  @Column('bigint')
  timestamp: string;

  @ManyToOne(() => UserEntity, (user) => user.annotations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;
}
