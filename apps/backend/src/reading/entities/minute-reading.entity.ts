import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import {BaseReading} from "./base-reading";

@Entity("live_reading")
export class LiveReadingEntity extends BaseReading {}
