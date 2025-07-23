import {computed, inject, Injectable, Signal, signal} from "@angular/core";
import {Annotation, HourlyReading, LiveReading, WorkingPeriod} from "@brado/types";
import { AnnotationService } from "./annotation.service";
import {firstValueFrom} from "rxjs";

@Injectable({ providedIn: 'root' })
export class AnnotationsStore {
  private readonly api = inject(AnnotationService);

  private readonly _allAnnotations = signal<{[key: string] : Annotation[]}>({});

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);


  getAnnotationsForReadings(readings: LiveReading[] | HourlyReading[] ): Signal<Annotation[]> {
    return computed(() => {


      if(!readings) return [];
      const allAnnotations = this._allAnnotations();

      const annotationsForSensor = allAnnotations?.[readings[0]?.sensorId];

      if(!annotationsForSensor) {
        return []
      }
      const timestamps = readings.map(r => +r.timestamp);
      const start = Math.min(...timestamps);
      const end = Math.max(...timestamps);

      return annotationsForSensor.filter(ann => +ann.from_timestamp >= start && +ann.to_timestamp <= end);
    });
  }


  loadAnnotationsBetween(fromTS: number, toTS: number) {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAnnotationsBetween(fromTS, toTS).subscribe({
      next: (annotations: Annotation[]) => this.annotationsToMerged(annotations),
      error: (err) => this._error.set('Failed to load Annotations'),
      complete: () => this._loading.set(false)
    });
  }

  loadAnnotationsForCurrentPeriod() {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAnnotationsForCurrentPeriod().subscribe({
      next: (annotations: Annotation[]) => this.annotationsToMerged(annotations),
      error: (err) => this._error.set('Failed to load Annotations'),
      complete: () => this._loading.set(false)
    });
  }

  loadAnnotationsAfter(fromTS: number) {
    this._loading.set(true);
    this._error.set(null);

    this.api.getAnnotationsAfter(fromTS).subscribe({
      next: (annotations: Annotation[]) => this.annotationsToMerged(annotations),
      error: (err) => this._error.set('Failed to load Annotations'),
      complete: () => this._loading.set(false)
    });
  }

  private annotationsToMerged(annotations: Annotation[]) {
    const uniqueSensors = Array.from(new Set(annotations.map(r => r.sensorId)));
    const annObject: {[key: string]: Annotation[]} = {};
    uniqueSensors.forEach(sensor => {
      annObject[sensor] = this.removeDuplicates(annotations.filter(r => r.sensorId === sensor))
    })
    this.mergeAnnotations(annObject)
  }

  mergeAnnotations(annotations: {[key: string] : Annotation[]}) {
    this._allAnnotations.update(current => {
      const updated = {...current};

      for (const key in annotations) {
        if (updated[key]) {

          updated[key] = this.removeDuplicates([...updated[key], ...annotations[key]]).sort((a,b) => +a.from_timestamp - +b.from_timestamp)
        } else {
          // new sensor data
          updated[key] = annotations[key];
        }
      }

      console.log(updated)
      return updated;
    });
  }

  removeDuplicates(readings: Annotation[]): Annotation[] {
    const seen = new Set<string>();

    return readings.filter(reading => {
      const key = `${reading.from_timestamp}|${reading.to_timestamp}|${reading.sensorId}|${reading.type}|${reading.text}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async createAnnotation(newAnnotation: Partial<Annotation>) {
    const res = await firstValueFrom(this.api.createAnnotation(newAnnotation))

    console.log(res)
    if(res && res.sensorId) {
      this.mergeAnnotations({[res.sensorId]: [res]})

    }
  }
}
