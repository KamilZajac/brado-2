// src/push/entities/push-subscription.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_subscriptions')
@Unique('uq_push_endpoint', ['endpoint'])
@Index('ix_push_revoked_lastseen', ['revokedAt', 'lastSeenAt'])
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique per browser/device subscription
  @Column({ type: 'text' })
  endpoint!: string;

  // Keys required by web-push
  @Column({ type: 'text' })
  p256dh!: string;

  @Column({ type: 'text' })
  auth!: string;

  // Optional diagnostics/segmentation
  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  appVersion?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  locale?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  platform?: string | null; // e.g., 'ios', 'android', 'desktop'

  // Lifecycle / housekeeping
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  lastPushStatus?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
