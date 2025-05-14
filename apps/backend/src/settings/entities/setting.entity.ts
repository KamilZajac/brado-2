import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    hourlyTarget: number;

    @Column({ type: 'int' })
    dailyTarget: number;

    @Column({ type: 'json', nullable: true }) // Można użyć "text", jeśli `json` nie jest wspierane
    sensorNames: string[]; // Tablica nazw sensorów
}
