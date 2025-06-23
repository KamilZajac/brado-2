import { Directive, OnInit, signal } from "@angular/core";
import {AnnotationService} from "../services/annotation/annotation.service";
import {getStartOfToday, getWeeklyTimestamps} from "../services/data/data.service";
import {Annotation} from "@brado/types";
import { firstValueFrom } from "rxjs";

@Directive()
export class ChartWrapperDirective implements OnInit {

  public mode: 'live' | 'weekly' = 'live';
  public groupedAnnotations = signal<{ [p: number]: Annotation[] }>({})


  constructor(private annotationService: AnnotationService) {
  }


  ngOnInit() {
    this.getAnnotations()
  }


  public async getAnnotations() {
    const { from, to } = getWeeklyTimestamps()

    const annotations =
      this.mode === 'live' ?
        await firstValueFrom(this.annotationService.getAnnotationsAfter(getStartOfToday())) :
        await firstValueFrom(this.annotationService.getAnnotationsBetween(from, to));

    const grouped: {[key: number]: Annotation[]} = {};

    annotations.forEach(annotation => {
      grouped[annotation.sensorId] = [...(grouped[annotation.sensorId] || []), annotation]
    })

    this.groupedAnnotations.set(grouped);
  }
}
