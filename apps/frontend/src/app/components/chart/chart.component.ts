import {Component, effect, EventEmitter, input, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Annotation, AnnotationType, HourlyReading, LiveReading, TempReading, User} from "@brado/types";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip
} from 'chart.js';
import {BaseChartDirective} from 'ng2-charts';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import {hourlyBackgroundPlugin} from "./plugins/background-plugin";
import {
  ActionSheetController,
  AlertController,
  IonRow,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import {TextInputModalComponent} from "../text-input-modal/text-input-modal.component";
import {AnnotationService} from "../../services/annotation/annotation.service";
import {firstValueFrom} from 'rxjs';
import {DataService} from "../../services/data/data.service";
import {PopoverController} from "@ionic/angular";
import {ChartOperation, ChartOperationsListComponent} from "./chart-operations-list/chart-operations-list";
import {PointEditorComponent} from "./chart-point-editor/chart-point-editor";
import {DataStore} from "../../services/data/data.store";

ChartJS.register(
  LineController,
  BarController,
  BarElement,
  CategoryScale,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin,
  hourlyBackgroundPlugin
);

const allowedKeys = ['delta', 'value', 'average', 'dailyTotal'];

interface Series {
  x: number;
  y: number | null;
  data: Partial<HourlyReading | LiveReading>
}

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [BaseChartDirective, IonRow],
  providers: [ReadingsToSeriesMultiplePipe, ReadingsToSeriesPipe, ModalController, PopoverController]
})
export class ChartComponent implements OnInit {
  @Input() data: HourlyReading[] | LiveReading[] = [];
  @Input() temperature: TempReading[] = [];
  @Input() dataMultiple: HourlyReading[][] | LiveReading[][] = [];
  @Input() disableAnimation = false;
  @Input() isLive = false;
  @Input() hourlyTarget = 0;
  @Input() sensorNames: { [key: number]: string } = {};
  annotations = input<Annotation[]>()

  @Input() chartType: 'line' | 'bar' = 'line';
  @Input() keyToDisplay: 'total' | 'value' | 'average' | 'delta' | 'dailyTotal' = 'value';

  chartData!: ChartData<'line'>;
  chartOptions: ChartOptions = {}

  chartMode = ChartOperation.DEFAULT;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  isAnnotationVisible = true;

  newAnnotation: Annotation | null = null;

  @Output() reloadAnnotations = new EventEmitter()

  constructor(
    private modalCtrl: ModalController,
    private annotationService: AnnotationService,
    private toastCtrl: ToastController,
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private dataService: DataService, // Todo

    private dataStore: DataStore,
    private popoverCtrl: PopoverController

) {
    effect(() => {
      if (this.annotations()?.length) {
        this.buildChartOptions()
      }
    })
  }

  ngOnInit() {
    this.buildChartOptions()
    this.prepareChart();
  }

  ngOnChanges() {
    this.prepareChart();
  }

  async buildChartOptions() {
    const annotations: any = {};

    if (this.isAnnotationVisible) {

      const workingPeriods = await firstValueFrom(this.dataService.getWorkingPeriods());

      const firstReading = this.data[this.data.length - 1];
      const lastReading = this.data[0];

      const filteredPeriods = workingPeriods.filter(w =>  w.sensorId === firstReading.sensorId && +w.start >= +firstReading.timestamp  );

      // filteredPeriods[filteredPeriods.length - 1].end = null


      filteredPeriods.forEach((reading, idx) => {

        if(reading.start) {
          annotations[idx] =  {
            type: 'line',
            borderColor: 'green',
            id: 1000 + idx,
            borderWidth: 1,
            label: {
              display: true,
              backgroundColor: 'green',
              borderRadius: 0,
              color: '#fff',
            },
            xMax: reading.end ? +reading.end : +lastReading.timestamp,
            xMin: +reading.start,
            xScaleID: 'x',
            yMax: 40000,
            yMin: 0,
            yScaleID: 'y'
          }
        }
      })

      this.annotations()?.forEach((pt, i) => {

        const chartValues = this.chartData.datasets[0].data.map((item: any) => item.y)
        const average = chartValues.reduce((a, b) => a + b) / chartValues.length;

        annotations[`point${i}`] =
          {
            type: 'line',
            borderColor: this.getAnnotationColor(pt.type),
            id: pt.id,
            borderWidth: 1,
            label: {
              display: true,
              backgroundColor: this.getAnnotationColor(pt.type),
              borderRadius: 0,
              color: '#fff',
              content: [this.getAnnotationTitle(pt.type), pt.text, '- ' + pt.user.username],
            },
            xMax: +pt.from_timestamp,
            xMin: +pt.to_timestamp,
            xScaleID: 'x',
            yMax: average,
            yMin: average,
            yScaleID: 'y'
          }
      });
    }

    this.chartOptions = {
      responsive: true,
      animation: {
        duration: 0,
      },
      plugins: {
        hourlyBackground: {
          hourlyTarget: this.hourlyTarget
        },
        legend: {
          display: false,
        },
        annotation: {
          interaction: {
            mode: 'point'  // <-- this is crucial
          },
          annotations: {
            ...(this.getTarget ? {
              thresholdLine: {
                type: 'line',

                yMin: this.getTarget,
                yMax: this.getTarget,

                borderColor: 'red',
                borderWidth: 2,
                borderDash: [6, 6], // optional dashed line
                label: {
                  display: true,
                  content: 'Cel',
                  position: 'start',
                  backgroundColor: 'rgba(255,0,0,0.1)',
                  color: '#000'
                }
              }

            } : {}),
            ...annotations
          },
        },
        tooltip: this.temperature.length ? {} : {
          mode: 'index',
          intersect: true,
          callbacks: {
            title: (tooltipItems) => {
              // Show the timestamp (x value)
              const item = tooltipItems[0];
              const date = new Date(item.parsed.x);
              return date.toLocaleString(); // or format as needed
            },
            label: (tooltipItem) => {
              const y = tooltipItem.parsed.y;
              return `Wartość: ${y}`;
            },
            afterLabel: (tooltipItem) => {
              const data = (tooltipItem.raw as { data: LiveReading })?.data
              return `Δ Delta: ${data?.delta} \nSuma: ${data?.dailyTotal} \nData: ${new Date(+data?.timestamp).toLocaleString()}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy', // horizontal only
            modifierKey: 'shift', // Optional: hold Ctrl while dragging to pan
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true
            },
            mode: 'xy',
          }
        }
      },
      scales: {
        x: {
          type: 'time',  // this now works
          time: {
            unit: 'hour',
            tooltipFormat: 'yyyy-MM-dd HH:mm:ss',
            displayFormats: {
              // minute: 'HH:mm',
              hour: 'HH:mm',
              // second: 'HH:mm:ss'
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Value'
          }
        }
      }
    };
  }

  prepareChart() {

    let datasets: any = [];

    if (this.temperature.length) {

      datasets = [
        {
          label: 'Temperatura (°C)',
          data: this.temperature.map(entry => ({
            x: new Date(Number(entry.timestamp)),
            y: entry.temperature
          })),
          borderWidth: 2,
          borderColor: 'red',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Wilgotność (%)',
          data: this.temperature.map(entry => ({
            x: new Date(Number(entry.timestamp)),
            y: entry.humidity
          })),
          borderWidth: 2,
          borderColor: 'blue',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Punkt rosy (°C)',
          data: this.temperature.map(entry => ({
            x: new Date(Number(entry.timestamp)),
            y: entry.dewPoint
          })),
          borderWidth: 2,
          borderColor: 'green',
          fill: false,
          tension: 0.1
        }
      ]
    } else if (this.dataMultiple.length > 0) {

      const baseStartTimestamp = +this.dataMultiple[0][0].timestamp

      let normalizedSeries: Series[][] = this.dataMultiple.map(readings => {
        const series = readings.map((read) => ({
          x: +read.timestamp,
          y: +read.value,
          data: read
        }));
        return this.normalizeDatasetToBaseStart(series, baseStartTimestamp)
      })

      normalizedSeries = this.fillMissingTimestampsWithNullsAndData(normalizedSeries);

      datasets = (normalizedSeries.map((dataset, index) => ({
        label: `Dataset ${index + 1}`, spanGaps: true,
        data: dataset.map((read) => (read)),
        fill: false,
        tension: 0.1,
        borderColor: this.getColorForIndex(index),
        backgroundColor: this.getColorForIndex(index),
      })))
    }

    if (this.data.length > 0) {
      const clearedDataset = this.filterBorderDuplicates(this.data);
      datasets = [
        {
          label: 'Sensor Values',
          data: clearedDataset.map((read) => ({
            x: +read.timestamp,
            y: +(read as any)[this.keyToDisplay],
            data: read
          })),
          fill: false,
          tension: 0.1,
          borderColor: '#3b82f6',
          // backgroundColor: '#3b82f6',

          pointBackgroundColor: (context: any) => {
            const isFailure = context.raw?.data?.isConnectionFailure;
            return isFailure ? 'red': '#3b82f6'
          },
          pointBorderColor: (context: any) => {
            const isFailure = context.raw?.data?.isConnectionFailure;
            return isFailure ? 'red': '#3b82f6'
          }
        },


      ]
    }


    this.chartData = {
      datasets
    }
  }


  selectChartType(type: 'bar' | 'line') {
    this.chartType = type;
  }

  getColorForIndex(index: number): string {
    const colors = ['#3b82f6', '#34d399', '#f97316', '#e11d48', '#8b5cf6'];
    return colors[index % colors.length];
  }


  public filterBorderDuplicates(readings: LiveReading []): LiveReading[] {

    return readings;
    // Debug
    if (readings.length < 3) return readings;

    const result: LiveReading[] = [];


    for (let i = 0; i < readings.length; i++) {
      const prev = readings[i - 1]?.value;
      const curr = readings[i].value;
      const next = readings[i + 1]?.value;

      const isStartOfBlock = curr !== prev;
      const isEndOfBlock = curr !== next;

      const isTrailingDuplicate =
        i === readings.length - 1 && curr === prev;

      if ((isStartOfBlock || isEndOfBlock) && !isTrailingDuplicate) {
        result.push(readings[i]);
      }
    }

    return result;
  }

  get getTarget() {
    if (!this.hourlyTarget) {
      return 0
    }

    // if (this.isLive) {
    switch (this.keyToDisplay) {
      case 'value':
        return null;
      case 'delta':
        return this.isLive ? this.hourlyTarget / 60 : this.hourlyTarget
      case 'dailyTotal':
        return this.hourlyTarget * 8
      case 'average':
        return this.hourlyTarget / 60
      default:
        return 0


    }
  }


  normalizeDatasetToBaseStart(
    dataset: Series[],
    baseStart: number
  ): Series[] {
    if (!dataset.length) return [];

    const originalStart = dataset[0].x;

    return dataset.map(point => ({
      x: baseStart + (+point.x - +originalStart),
      y: point.y,
      data: point.data
    }));
  }


  fillMissingTimestampsWithNullsAndData(datasets: Series[][]): Series[][] {
    // 1. Collect all unique timestamps
    const allTimestamps = new Set<number>();
    datasets.forEach(dataset => {
      dataset.forEach(point => allTimestamps.add(point.x));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // 2. Normalize each dataset
    const normalized = datasets.map(dataset => {
      const pointMap = new Map<number, Series>();
      dataset.forEach(point => pointMap.set(point.x, point));

      return sortedTimestamps.map(x => {
        const existing = pointMap.get(x);
        if (existing) {
          return {...existing};
        } else {
          return {x, y: null, data: {}};
        }
      });
    });

    return normalized;
  }

  public get availableKeys(): string[] {
    // console.log(this.data)
    if (this.temperature.length) {
      return []
    }
    const arr = this.dataMultiple.length > 0 ? [...this.dataMultiple[0]] : [...this.data];
    return Object.keys([...arr][0]).filter(k => allowedKeys.includes(k))
  }

  public get sensorId(): number {
    if (this.temperature.length) {
      return 0
    }
    return this.dataMultiple.length > 0 ? this.dataMultiple[0][0].sensorId : this.data[0].sensorId
  }

  public get sensorName(): string {
    return this.sensorNames[this.sensorId] ?? this.sensorId
  }

  selectDataKey(key: any) {
    this.keyToDisplay = key;
    this.prepareChart();
    this.buildChartOptions()

  }

  getKeyName(key: string) {
    if (key === 'delta') {
      return 'Sztuki'
    } else if (key === 'average') {
      return 'Średnia / h'
    } else if (key === 'value') {
      return 'Licznik'
    } else if (key === 'dailyTotal') {
      return 'Dziennie'
    } else {
      return key
    }
  }

  async onChartDoubleClick(event: MouseEvent) {
    const {offsetX, offsetY} = event;
    const annotations = this.chart?.options?.plugins?.annotation?.annotations;

    if (!annotations) return;

    for (const [key, ann] of Object.entries(annotations)) {
      if (ann?.type === 'line' && (ann.value != null || ann.xMin != null)) {

        // @ts-ignore
        const scale = this.chart?.chart.scales['x']
        const x = scale?.getPixelForValue(ann.xMin as number || ann.value as number) || 0;

        const isNearLine = Math.abs(offsetX - x) < 5; // 5px tolerance
        if (isNearLine && ann.id) {
          const confirmed = await this.showConfirmAlert();

          if (confirmed) {
            const success = await firstValueFrom(this.annotationService.deleteAnnotation(+ann.id));
            if (success) {
              this.reloadAnnotations.emit()
            }
          }
        }
      }
    }

    this.chart?.chart?.resetZoom();
  }

  async showConfirmAlert(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Usunąć annotacje?',
      buttons: [
        {
          text: 'Nie',
          role: 'cancel',
          handler: () => false
        },
        {
          text: 'Tak',
          handler: () => true
        }
      ]
    });

    await alert.present();

    // Wait for alert dismissal and return result
    const {role} = await alert.onDidDismiss();
    return role !== 'cancel'; // returns true if "Yes" clicked
  }

  onChartClick(event: any) {

    if(this.chartMode === ChartOperation.ADD_ANNOTATION) {
      const chartInstance = this.chart?.chart;
      if (!chartInstance) return;

      const clickX = event.event.x ?? 0;
      const clickY = event.event.y ?? 0;

      const xScale = chartInstance.scales['x'];
      const xValue = xScale.getValueForPixel(clickX);

      const yScale = chartInstance.scales['y'];
      const yValue = yScale.getValueForPixel(clickY) || 0

      if (xValue) {
        this.addValueToNewAnnotation(xValue)
      }
    }

    if(this.chartMode === ChartOperation.ADD_EDIT_POINTS) {
      const existingReading = event.active[0]?.element?.$context.raw?.data;

      if(existingReading) {
        this.openPointEditorModal(undefined, existingReading);
        return
      }
      const chartInstance = this.chart?.chart;
      if (!chartInstance) return;
      const clickX = event.event.x ?? 0;
      const xScale = chartInstance.scales['x'];
      const xValue = xScale.getValueForPixel(clickX);

      this.openPointEditorModal(xValue, undefined);

    }
  }

  async openPointEditorModal(timestamp?: number, reading?: LiveReading) {
    if(!timestamp && !reading) return;
    const modal = await this.modalCtrl.create({
      component: PointEditorComponent,
      componentProps: {
        timestamp, reading, sensorId: this.sensorId
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      console.log('User submitted:', data);
      this.dataStore.createUpdateLiveReading(data)
      // Optionally update dataset or save
    }
  }

  async openNewAnnotationModal() {
    const modal = await this.modalCtrl.create({
      component: TextInputModalComponent,
      componentProps: {
        message: `Wpisz treść adnotacji (opcjonalnie):`
      }
    });

    await modal.present();

    const {data, role} = await modal.onDidDismiss();

    if (role === 'confirm') {

      const annotation: Partial<Annotation> = {
        ...this.newAnnotation,
        text: data,
      }


      this.annotationService.createAnnotation(annotation).subscribe({
        next: (res) => {
          this.toast('Dodano adnotację');
          this.reloadAnnotations.emit()
          this.newAnnotation = null

        },
        error: (err) => {
          this.newAnnotation = null

          this.toast('Wystąpił błąd')
        },
      });
    }
  }

  private async toast(message: string) {
    this.toastCtrl.create({message, duration: 2000}).then(t => t.present());
  }

  toggleAnnotations() {
    this.isAnnotationVisible = !this.isAnnotationVisible;
    this.buildChartOptions()
  }

  async presentAnnotationOptions() {
    const newAnnotation: Annotation = {
      from_timestamp: "",
      to_timestamp: "",
      sensorId: this.sensorId,
      text: "",
      type: 1,
      user: {} as User,
      id: -1
    };

    const startAddingAnnotation = (): void => {
      this.newAnnotation = newAnnotation;
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Wybierz typ adnotacji',
      buttons: [
        {
          text: 'Przerwa',
          handler: () => {
            newAnnotation.type = AnnotationType.BREAK_FROM_TO;
            startAddingAnnotation()
          }
        },
        {
          text: 'Awaria',
          handler: () => {
            newAnnotation.type = AnnotationType.ACCIDENT_FROM_TO;
            startAddingAnnotation()

          }
        },
        {
          text: 'Wymiana Strzemion',
          handler: () => {
            newAnnotation.type = AnnotationType.CLIPS_CHANGE;
            startAddingAnnotation()
          }
        },
        {
          text: 'Organizacja',
          handler: () => {
            newAnnotation.type = AnnotationType.ORGANISATION_FROM_TO;
            startAddingAnnotation()
          }
        },
        {
          text: 'Anuluj',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private addValueToNewAnnotation(xValue: number) {
    if (!this.newAnnotation) {
      return
    }

    if (this.newAnnotation.from_timestamp.length === 0) {
      this.newAnnotation.from_timestamp = Math.round(xValue).toString()
    } else {
      this.newAnnotation.to_timestamp = Math.round(xValue).toString()
    }

    if (this.newAnnotation.to_timestamp) {

      this.openNewAnnotationModal()

    }
  }

  public getAnnotationTitle(annotationType: AnnotationType): string {
    switch (annotationType) {
      case AnnotationType.BREAK_FROM_TO:
        return 'Przerwa';
      case AnnotationType.ACCIDENT_FROM_TO:
        return 'Awaria'
      case AnnotationType.ORGANISATION_FROM_TO:
        return 'Organizacja';
      case AnnotationType.CLIPS_CHANGE:
        return 'Wymiana Strzemion';
      default:
          return ''
    }
  }

  private getAnnotationColor(annotationType: AnnotationType) {
    switch (annotationType) {
      case AnnotationType.BREAK_FROM_TO:
        return 'rgba(60, 180, 75, 0.8) ';
      case AnnotationType.ACCIDENT_FROM_TO:
        return 'rgba(200, 30, 60, 0.8) '
      case AnnotationType.ORGANISATION_FROM_TO:
        return 'rgba(20, 90, 50, 0.85) ';
      case AnnotationType.CLIPS_CHANGE:
        return 'rgba(240, 200, 0, 0.8) ';
      default:
        return ''
    }
  }

  async openChartOperationsList(ev: Event) {
    const popover = await this.popoverCtrl.create({
      component: ChartOperationsListComponent,
      event: ev,
      translucent: true
    });
    await popover.present();

    const { data, role } = await popover.onWillDismiss(); // or onDidDismiss()

    if (data?.operation) {
      console.log(data.operation)
      this.chartMode = data.operation;
      console.log(this.chartMode)
    }
  }
}


