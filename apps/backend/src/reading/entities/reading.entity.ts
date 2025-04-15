import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Reading {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sensorId: number;

    @Column('integer')
    value: number;

    @Column()
    timestamp: Date;
}
