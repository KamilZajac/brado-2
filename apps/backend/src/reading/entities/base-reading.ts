import {Column, PrimaryGeneratedColumn } from "typeorm";

export class BaseReading {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sensorId: number;

    @Column('integer')
    value: number;

    @Column('bigint')
    timestamp: string;
}
