import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from '../../users/entities/users.entity';
import { AnnotationType } from "@brado/types";

@Entity('annotation')
export class AnnotationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  @Column()
  sensorId: number;

  @Column('bigint')
  from_timestamp: string;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  to_timestamp: string;

  @Column({
    type: 'enum',
    enum: AnnotationType,
    default: AnnotationType.BREAK_FROM_TO,
  })
  type: AnnotationType;

  @ManyToOne(() => UserEntity, (user) => user.annotations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;
}
