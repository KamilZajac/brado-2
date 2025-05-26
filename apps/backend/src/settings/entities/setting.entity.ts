import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'int' })
  hourlyTarget: number;

  @Column({ type: 'json', nullable: true }) // Można użyć "text", jeśli `json` nie jest wspierane
  sensorNames: string[]; // Tablica nazw sensorów
}
