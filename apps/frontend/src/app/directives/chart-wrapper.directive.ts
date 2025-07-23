import {Directive, OnInit, signal} from "@angular/core";
import {AnnotationService} from "../services/annotation/annotation.service";
import {getStartOfToday, getWeeklyTimestamps} from "../services/data/data.service";
import {Annotation} from "@brado/types";
import {firstValueFrom} from "rxjs";
import {AnnotationsStore} from "../services/annotation/annotations.store";

@Directive()
export class ChartWrapperDirective implements OnInit {

  public mode: 'live' | 'weekly' = 'live';

  constructor(private annotationsStore: AnnotationsStore) {
  }

  ngOnInit() {
    this.getAnnotations()
  }

  public async getAnnotations() {
    const {from, to} = getWeeklyTimestamps()

    this.mode === 'live' ?
      this.annotationsStore.loadAnnotationsForCurrentPeriod() :
      this.annotationsStore.loadAnnotationsBetween(from, to);
  }
}
