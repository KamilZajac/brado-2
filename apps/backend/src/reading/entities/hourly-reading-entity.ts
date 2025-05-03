import {Column, Entity } from "typeorm";
import {BaseReading} from "./base-reading";

@Entity('hourly_reading')
export class HourlyReadingEntity extends BaseReading{
    @Column({ type: 'int' })
    min: number;

    @Column({ type: 'int' })
    max: number;

    @Column({ type: 'float' })
    average: number;

    @Column({ type: 'int' })
    total: number;

}
