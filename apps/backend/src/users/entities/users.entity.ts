import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AnnotationEntity } from '../../annotation/entities/annotation.entity';
import { UserRole } from '@brado/types';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.WORKER,
  })
  role: UserRole;

  @OneToMany(() => AnnotationEntity, (annotation) => annotation.user)
  annotations: AnnotationEntity[];
}
