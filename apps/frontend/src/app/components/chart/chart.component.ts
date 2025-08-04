import {Component, effect, EventEmitter, inject, input, Input, OnInit, Output, ViewChild} from '@angular/core';
import {
  Annotation,
  AnnotationType,
  getAnnotationTitle, getPolishDayKey,
  HourlyReading,
  LiveReading,
  TempReading,
  User,
  WorkingPeriod
} from "@brado/types";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import {DataSourceOptionsComponent} from "../shared/data-source-options/data-source-options.component";
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
import {annotationTooltipPlugin} from "./plugins/annotations-tooltip-plugin";
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
import {DataService, getCurrentMonthTimestamps} from "../../services/data/data.service";
import {PopoverController} from "@ionic/angular";
import {ChartOperation, ChartOperationsListComponent} from "./chart-operations-list/chart-operations-list";
import {PointEditorComponent} from "./chart-point-editor/chart-point-editor";
import {DataStore} from "../../services/data/data.store";
import {AnnotationsStore} from "../../services/annotation/annotations.store";
import {DatePipe} from "@angular/common";
import {TimeRange} from "../date-picker/date-picker.component";

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
  hourlyBackgroundPlugin,
  annotationTooltipPlugin
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
  imports: [BaseChartDirective, IonRow, DatePipe, DataSourceOptionsComponent],
  providers: [ReadingsToSeriesMultiplePipe, ReadingsToSeriesPipe, ModalController, PopoverController]
})
export class ChartComponent implements OnInit {

  dataStore = inject(DataStore)
  annotationsStore = inject(AnnotationsStore)

  // Make Math available in the template
  Math = Math;

  // Make ChartOperation enum available in the template
  protected readonly ChartOperation = ChartOperation;

  @Input() data: HourlyReading[] | LiveReading[] = [];
  @Input() temperature: TempReading[] = [];
  @Input() dataMultiple: HourlyReading[][] | LiveReading[][] = [];
  @Input() ranges: TimeRange[] = [];
  @Input() disableAnimation = false;
  @Input() isLive = false;
  @Input() hourlyTarget = 0;
  @Input() sensorNames: { [key: number]: string } = {};
  // annotations = this.annotationsStore.getAnnotationsForReadings(this.data);

  @Input() chartType: 'line' | 'bar' = 'line';
  @Input() keyToDisplay: 'total' | 'value' | 'average' | 'delta' | 'dailyTotal' = 'value';

  // Data selection properties
  dataSourceType: 'current-period' | 'last-days' = 'current-period';
  selectedDays: number = 7; // Default to 7 days
  daysOptions: number[] = Array.from({length: 29}, (_, i) => i + 2); // 2 to 30 days

  chartData!: ChartData<'line'>;
  chartOptions: ChartOptions = {}

  isDisplayingOlderData = false

  chartMode = ChartOperation.DEFAULT;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  isAnnotationVisible = true;

  newAnnotation: Annotation | null = null;

  // Store detected breaks
  detectedBreaks: { start: string, end: string, duration: number }[] = [];

  // Track the currently highlighted break
  highlightedBreak: { start: string, end: string, duration: number } | null = null;

  // Track selected points for bulk deletion
  selectedPoints: string[] = [];

  // Track range selection state
  rangeSelectionStart: string | null = null;
  rangeSelectionEnd: string | null = null;
  isSelectingRange = false;

  // Track drag selection state
  isDragging = false;
  dragStartX: number | null = null;
  dragEndX: number | null = null;

  @Output() reloadAnnotations = new EventEmitter()

  constructor(
    private modalCtrl: ModalController,
    private annotationService: AnnotationService,
    private toastCtrl: ToastController,
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private dataService: DataService, // Todo,
    private popoverCtrl: PopoverController
  ) {
    effect(() => {
      if (this.annotationsStore.getAnnotationsForReadings(this.data)?.length) {
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

  /**
   * Changes the data source type and updates the chart
   * @param type The new data source type
   */
  changeDataSourceType(type: 'current-period' | 'last-days') {
    this.dataSourceType = type;
    this.loadDataForSelectedPeriod();
  }

  /**
   * Changes the number of days to show data for and updates the chart
   * @param days The number of days to show data for
   */
  changeSelectedDays(days: number | any) {
    // Handle both direct number input from shared component and event from select element
    if (typeof days !== 'number') {
      days = days.target.value;
    }

    this.selectedDays = days;
    if (this.dataSourceType === 'last-days') {
      this.loadDataForSelectedPeriod();
    }
  }

  /**
   * Loads data for the selected time period
   */
  loadDataForSelectedPeriod() {
    if (this.dataSourceType === 'current-period') {
      // Use the current data, which should be for the current work period
      // No need to fetch new data
      this.data = this.dataStore.liveData()[this.sensorId].readings;
      this.prepareChart();
    } else if (this.dataSourceType === 'last-days') {
      // Calculate the timestamp for X days ago
      const now = new Date();
      const daysAgo = new Date();
      daysAgo.setDate(now.getDate() - this.selectedDays);
      daysAgo.setHours(0, 0, 0, 0);
      this.isDisplayingOlderData = true

      // Fetch data for the last X days
      if (this.isLive && this.data.length > 0) {
        const sensorId = this.data[0].sensorId;
        this.dataService.getDataAfterTimestamp(daysAgo.getTime()).subscribe(readings => {
          // Filter readings for the current sensor
          const filteredReadings = readings.filter(r => r.sensorId === sensorId);
          this.data = filteredReadings;
          this.prepareChart();
        });
      }
    }
  }

  async buildChartOptions() {
    const annotations: any = {};
    let workingPeriods: WorkingPeriod[] = [];

    // Fetch working periods if we have data
    if (this.data.length > 0 || this.dataMultiple.length > 0) {
      try {

        const allWorkingPeriods = (this.isLive ? this.dataStore.liveWorkPeriods() : this.dataStore.workPeriods())[this.sensorId];


        // Filter working periods for the current sensor
        const sensorId = this.sensorId
        workingPeriods = allWorkingPeriods
          .filter(w => w.sensorId === sensorId)
          .sort((a, b) => +a.start - +b.start);

      } catch (error) {
        console.error('Error fetching working periods:', error);
      }
    }

    if (this.isAnnotationVisible) {
      this.annotationsStore.getAnnotationsForReadings(this.data)().forEach((pt, i) => {
        const chartValues = this.chartData.datasets[0].data.map((item: any) => item.y)
        const average = chartValues.reduce((a, b) => a + b) / chartValues.length;

        annotations[`point${i}`] =
          {
            type: 'line',
            borderColor: this.getAnnotationColor(pt.type),
            id: pt.id,
            borderWidth: 5,
            tooltipData: {
              title: getAnnotationTitle(pt.type),
              text: pt.text
            },
            // label: {
            //   display: true,
            //   backgroundColor: this.getAnnotationColor(pt.type),
            //   borderRadius: 0,
            //   color: '#fff',
            //   // content: [this.getAnnotationTitle(pt.type), pt.text,], //  '- ' + pt.user.username
            // },
            xMax: +pt.from_timestamp,
            xMin: +pt.to_timestamp,
            xScaleID: 'x',
            yMax: average,
            yMin: average,
            yScaleID: 'y'
          }
      });

      // Add detected breaks as annotations
      if (this.isLive && !this.isDisplayingOlderData && this.detectedBreaks.length > 0) {
        const chartValues = this.chartData.datasets[0].data.map((item: any) => item.y);
        const minValue = Math.min(...chartValues.filter(y => y !== null));
        const maxValue = Math.max(...chartValues.filter(y => y !== null));
        const valueRange = maxValue - minValue;

        this.detectedBreaks.forEach((breakItem, i) => {
          // Check if this break is currently highlighted
          const isHighlighted = this.highlightedBreak &&
            this.highlightedBreak.start === breakItem.start &&
            this.highlightedBreak.end === breakItem.end;

          annotations[`break${i}`] = {
            type: 'box',
            xMin: +breakItem.start,
            xMax: +breakItem.end,
            yMin: minValue - (valueRange * 0.05),
            yMax: maxValue + (valueRange * 0.05),
            backgroundColor: isHighlighted ? 'rgba(255, 165, 0, 0.4)' : 'rgba(255, 165, 0, 0.2)',
            borderColor: isHighlighted ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)',
            borderWidth: isHighlighted ? 2 : 1,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `P (${Math.round(breakItem.duration)} min)`,
              position: 'start',
              backgroundColor: isHighlighted ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)',
              color: isHighlighted ? '#fff' : '#333',
              rotation: 30,
              font: {
                size: isHighlighted ? 14 : 12,
                weight: isHighlighted ? 'bold' : 'normal'
              }
            },
          };
        });
      }
    }

    this.chartOptions = {
      responsive: true,
      animation: {
        duration: 0,
      },
      plugins: {
        hourlyBackground: {
          workingPeriods: workingPeriods
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
            x: +entry.timestamp,
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
            x: +entry.timestamp,
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
            x: +entry.timestamp,
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

      // Detect breaks if this is live data
      if (this.isLive) {
        this.detectedBreaks = this.detectBreaks(this.data);
      }

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
            // Check if point is selected for bulk deletion
            if (context.raw?.data?._id && this.selectedPoints.includes(context.raw.data._id)) {
              return '#ff0000'; // Red for selected points
            }
            return isFailure ? 'red' : '#3b82f6'
          },
          pointBorderColor: (context: any) => {
            const isFailure = context.raw?.data?.isConnectionFailure;
            // Check if point is selected for bulk deletion
            if (context.raw?.data?._id && this.selectedPoints.includes(context.raw.data._id)) {
              return '#ff0000'; // Red for selected points
            }
            return isFailure ? 'red' : '#3b82f6'
          }
        },


      ]
    }


    this.chartData = {
      datasets
    }

    // Update chart options to display breaks
    if (this.detectedBreaks.length > 0) {
      this.buildChartOptions();
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

  /**
   * Detects breaks in the data array where 'delta' and/or 'value' doesn't change for 5 minutes or more
   * Only applies when isLive is true (LiveReading array)
   * Skips breaks when the company is not working (surrounded by non-real values)
   * @param readings The LiveReading array to detect breaks in
   * @returns An array of detected breaks, each with a start and end timestamp
   */
  public detectBreaks(readings: LiveReading[]): { start: string, end: string, duration: number }[] {
    if (!this.isLive || readings.length < 2) return [];

    let breaks: { start: string, end: string, duration: number }[] = [];
    let breakStart: string | null = null;
    let lastValue: number | null = null;
    let lastDelta: number | null = null;
    let lastTimestamp: string | null = null;

    // Sort readings by timestamp
    const sortedReadings = [...readings].sort((a, b) => +a.timestamp - +b.timestamp);

    for (let i = 0; i < sortedReadings.length; i++) {
      const reading = sortedReadings[i];

      // Skip the first reading as we need a previous reading to compare
      if (i === 0) {
        lastValue = reading.value;
        lastDelta = reading.delta;
        lastTimestamp = reading.timestamp;
        continue;
      }

      // Check if value and delta haven't changed
      const valueUnchanged = reading.value === lastValue || (lastValue != null && Math.abs(reading.value - lastValue) < 8);
      const deltaUnchanged = reading.delta === lastDelta || (lastDelta != null && Math.abs(reading.delta - lastDelta) < 8);

      // Calculate time difference in minutes
      const timeDiff = (+reading.timestamp - +lastTimestamp!) / (1000 * 60);

      // If we're in a break and either value or delta has changed, end the break
      if (breakStart && (!valueUnchanged || !deltaUnchanged)) {
        const duration = (+reading.timestamp - +breakStart) / (1000 * 60);
        // Only consider breaks of 5 minutes or more
        if (duration >= 5) {
          breaks.push({
            start: breakStart,
            end: lastTimestamp!,
            duration: duration
          });
        }
        breakStart = null;
      }

      // If value and delta haven't changed and time difference is significant, start a break
      if ((valueUnchanged && deltaUnchanged)) {
        if (!breakStart) {
          breakStart = lastTimestamp!;
        }
      }

      lastValue = reading.value;
      lastDelta = reading.delta;
      lastTimestamp = reading.timestamp;
    }

    // Check if we're still in a break at the end of the array
    if (breakStart && lastTimestamp) {
      const duration = (+lastTimestamp - +breakStart) / (1000 * 60);
      if (duration >= 5) {
        breaks.push({
          start: breakStart,
          end: lastTimestamp,
          duration: duration
        });
      }
    }


    // Filter out breaks that are already covered by existing annotations
    breaks = breaks.filter(breakItem => {
      // Check if this break overlaps with any existing annotation
      const isOverlappingWithAnnotation = this.annotationsStore.getAnnotationsForReadings(this.data)().some(annotation => {
        const annotationStart = +annotation.from_timestamp;
        const annotationEnd = +annotation.to_timestamp;
        const breakStart = +breakItem.start;
        const breakEnd = +breakItem.end;

        // Check for overlap
        return (
          // Break starts during annotation
          (breakStart >= annotationStart && breakStart <= annotationEnd) ||
          // Break ends during annotation
          (breakEnd >= annotationStart && breakEnd <= annotationEnd) ||
          // Break contains annotation
          (breakStart <= annotationStart && breakEnd >= annotationEnd)
        );
      });

      // Keep breaks that don't overlap with any annotation
      return !isOverlappingWithAnnotation;
    });

    // Filter out breaks that are at the beginning or end of the working period
    // (surrounded by non-real values)
    return breaks.filter(breakItem => {
      const breakStartIndex = sortedReadings.findIndex(r => r.timestamp === breakItem.start);
      const breakEndIndex = sortedReadings.findIndex(r => r.timestamp === breakItem.end);

      // Check if there are real values before the break
      const hasRealValuesBefore = sortedReadings
        .slice(Math.max(0, breakStartIndex - 5), breakStartIndex)
        .some(r => r.delta > 0);

      // Check if there are real values after the break
      const hasRealValuesAfter = sortedReadings
        .slice(breakEndIndex + 1, breakEndIndex + 6)
        .some(r => r.delta > 0);

      // Only keep breaks that are surrounded by real values
      return hasRealValuesBefore && hasRealValuesAfter;
    });
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
    if (this.temperature.length || !this.data) {
      return []
    }
    const arr = this.dataMultiple.length > 0 ? [...this.dataMultiple[0]] : [...this.data];
    return Object.keys([...arr][0]).filter(k => allowedKeys.includes(k))
  }

  public get sensorId(): number {
    if (this.temperature.length || !this.data) {
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
      return 'Ubój'
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

          console.log(ann)
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

  async showConfirmAlert(header: string = 'Usunąć annotacje?', message?: string): Promise<boolean> {
    const alertOptions: any = {
      header,
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
    };

    if (message) {
      alertOptions.message = message;
    }

    const alert = await this.alertController.create(alertOptions);

    await alert.present();

    // Wait for alert dismissal and return result
    const {role} = await alert.onDidDismiss();
    return role !== 'cancel'; // returns true if "Yes" clicked
  }

  onChartClick(event: any) {

    if (this.chartMode === ChartOperation.ADD_ANNOTATION) {
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

    if (this.chartMode === ChartOperation.ADD_EDIT_POINTS) {
      const existingReading = event.active[0]?.element?.$context.raw?.data;

      if (existingReading) {
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

    if (this.chartMode === ChartOperation.BULK_DELETE_POINTS) {
      const existingReading = event.active[0]?.element?.$context.raw?.data;

      if (existingReading && existingReading._id) {
        // Toggle selection of the point
        const pointId = existingReading._id;
        const index = this.selectedPoints.indexOf(pointId);

        if (index === -1) {
          // Add to selected points
          this.selectedPoints.push(pointId);
        } else {
          // Remove from selected points
          this.selectedPoints.splice(index, 1);
        }

        // Update chart to show selection
        this.buildChartOptions();
        this.chart?.update();
      }
    }

    if (this.chartMode === ChartOperation.RANGE_SELECT_POINTS) {
      const existingReading = event.active[0]?.element?.$context.raw?.data;

      if (existingReading && existingReading._id) {
        if (!this.isSelectingRange) {
          // Start range selection
          this.rangeSelectionStart = existingReading._id;
          this.isSelectingRange = true;
          this.selectedPoints = [existingReading._id]; // Clear previous selection and add start point
          this.toast('Wybierz punkt końcowy zakresu');
        } else {
          // End range selection
          this.rangeSelectionEnd = existingReading._id;
          this.isSelectingRange = false;

          // Select all points between start and end
          this.selectPointsInRange();
        }

        // Update chart to show selection
        this.buildChartOptions();
        this.chart?.update();
      }
    }
  }

  /**
   * Selects all points between the start and end points of the range
   */
  private selectPointsInRange() {
    if (!this.rangeSelectionStart || !this.rangeSelectionEnd) {
      return;
    }

    // Get all points from the chart data
    const chartPoints = this.chartData.datasets[0].data
      .filter((point: any) => point.data && point.data._id)
      .map((point: any) => ({
        id: point.data._id,
        timestamp: +point.data.timestamp
      }));

    // Find the timestamps of the start and end points
    const startPoint = chartPoints.find(point => point.id === this.rangeSelectionStart);
    const endPoint = chartPoints.find(point => point.id === this.rangeSelectionEnd);

    if (!startPoint || !endPoint) {
      this.toast('Nie można znaleźć punktów zakresu');
      return;
    }

    // Ensure start is before end (or swap them)
    const startTimestamp = Math.min(startPoint.timestamp, endPoint.timestamp);
    const endTimestamp = Math.max(startPoint.timestamp, endPoint.timestamp);

    // Select all points within the range
    this.selectedPoints = chartPoints
      .filter(point => point.timestamp >= startTimestamp && point.timestamp <= endTimestamp)
      .map(point => point.id);

    this.toast(`Zaznaczono ${this.selectedPoints.length} punktów`);
  }

  async openPointEditorModal(timestamp?: number, reading?: LiveReading) {
    if (!timestamp && !reading) return;
    const modal = await this.modalCtrl.create({
      component: PointEditorComponent,
      componentProps: {
        timestamp, reading, sensorId: this.sensorId
      }
    });

    await modal.present();

    const {data} = await modal.onWillDismiss();
    if (data) {
      console.log('User submitted:', data);
      this.dataStore.createUpdateLiveReading(data)
      // Optionally update dataset or save
    }
  }

  async openNewAnnotationModal(annotation: Partial<Annotation>) {
    const modal = await this.modalCtrl.create({
      component: TextInputModalComponent,
      componentProps: {
        message: `Wpisz treść adnotacji (opcjonalnie):`
      }
    });

    await modal.present();

    const {data, role} = await modal.onDidDismiss();

    if (role === 'confirm') {

      const newAnnotation: Partial<Annotation> = {
        ...annotation,
        text: data,
      }


      this.annotationsStore.createAnnotation(newAnnotation);

      this.detectedBreaks = this.detectedBreaks.filter(b => b.start !== newAnnotation.from_timestamp);

      // this.annotationService.createAnnotation(newAnnotation).subscribe({
      //   next: (res) => {
      //     this.toast('Dodano adnotację');
      //     this.reloadAnnotations.emit()
      //     this.newAnnotation = null
      //   },
      //   error: (err) => {
      //     this.newAnnotation = null
      //
      //     this.toast('Wystąpił błąd')
      //   },
      // });
    }
  }

  private async toast(message: string) {
    this.toastCtrl.create({message, duration: 2000}).then(t => t.present());
  }

  toggleAnnotations() {
    this.isAnnotationVisible = !this.isAnnotationVisible;
    this.buildChartOptions()
  }

  async presentAnnotationOptions(cb: (ann: Annotation) => any) {
    // Todo enable regular annotations back
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
      // this.newAnnotation = newAnnotation;
      cb(newAnnotation);
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

      this.openNewAnnotationModal(this.newAnnotation)

    }
  }

  private getAnnotationColor(annotationType: AnnotationType) {
    switch (annotationType) {
      case AnnotationType.BREAK_FROM_TO:
        return 'rgba(60, 180, 75, 0.8) ';
      case AnnotationType.ACCIDENT_FROM_TO:
        return 'rgba(255, 0, 5, 0.8) '
      case AnnotationType.ORGANISATION_FROM_TO:
        return 'rgba(237, 227, 81 , 0.85) ';
      case AnnotationType.CLIPS_CHANGE:
        return 'rgba(0,100,240, 0.8) ';
      default:
        return ''
    }
  }

  /**
   * Creates an annotation from a detected break
   * @param breakItem The break to create an annotation from
   */
  async createAnnotationFromBreak(breakItem: { start: string, end: string, duration: number }) {
    // Create a new annotation with the break's start and end timestamps
    const newAnnotation: Partial<Annotation> = {
      from_timestamp: breakItem.start,
      to_timestamp: breakItem.end,
      sensorId: this.sensorId,
      type: AnnotationType.BREAK_FROM_TO,
      text: `Automatycznie wykryta przerwa (${Math.round(breakItem.duration)} min)`
    };

    this.presentAnnotationOptions(async (ann) => {

      this.openNewAnnotationModal({...newAnnotation, type: ann.type})

    })
  }

  /**
   * Highlights the annotation corresponding to a break when hovering over its chip
   * @param breakItem The break to highlight
   */
  highlightBreakAnnotation(breakItem: { start: string, end: string, duration: number }) {
    this.highlightedBreak = breakItem;
    this.buildChartOptions();
    this.chart?.update();
  }

  /**
   * Removes the highlight from the break annotation when the mouse leaves the chip
   */
  unhighlightBreakAnnotation() {
    this.highlightedBreak = null;
    this.buildChartOptions();
    this.chart?.update();
  }

  /**
   * Deletes the selected points after confirmation
   */
  async deleteSelectedPoints() {
    if (!this.selectedPoints.length) {
      await this.toast('Nie wybrano żadnych punktów do usunięcia');
      return;
    }

    const confirmed = await this.showConfirmAlert(
      'Potwierdź usunięcie',
      `Czy na pewno chcesz usunąć ${this.selectedPoints.length} wybranych punktów?`
    );

    if (confirmed) {
      try {
        await this.dataStore.deleteReadings(this.selectedPoints);
        await this.toast(`Usunięto ${this.selectedPoints.length} punktów`);
        this.selectedPoints = []; // Clear selection
        this.chartMode = ChartOperation.DEFAULT; // Reset chart mode
      } catch (error) {
        console.error('Error deleting points:', error);
        await this.toast('Wystąpił błąd podczas usuwania punktów');
      }
    }
  }

  async openChartOperationsList(ev: Event) {
    const popover = await this.popoverCtrl.create({
      component: ChartOperationsListComponent,
      componentProps: {
        isLive: this.isLive,
        showExport: !(this.dataMultiple.length > 1)
      },
      event: ev,
      translucent: true
    });
    await popover.present();

    const {data, role} = await popover.onWillDismiss(); // or onDidDismiss()

    if (data?.operation) {
      // this.chartMode = data.operation;
      //
      if(
        data.operation === ChartOperation.EXPORT_RAW
      ) {
        const {from, to } = getCurrentMonthTimestamps()

        this.dataService.exportRawData(from, to, this.sensorId.toString()).subscribe((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.sensorName}-surowe.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
          });
        }

      if(
        data.operation === ChartOperation.EXPORT
      ) {


        const download = (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          a.download = `${this.sensorName}-${getPolishDayKey(new Date().getTime())}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
        // (this.isLive ? this.dataService.exportLiveData(this.sensorId) : this.dataService.exportMonthlyData(from, to, this.sensorId))

        if(this.isLive) { // live
          this.dataService.exportLiveData(this.sensorId.toString()).subscribe((blob) => download(blob));
        } else if (this.ranges.length) { // compare

          const range = this.ranges[0] // we allow to export only single range charts;
          this.dataService.exportMonthlyData(+range.from, +range.to, this.sensorId.toString()).subscribe((blob) => download(blob));


        } else { // hourly
          const {from, to } = getCurrentMonthTimestamps()
          this.dataService.exportMonthlyData(from, to, this.sensorId.toString()).subscribe((blob) => download(blob));
        }

      }

      if(
        data.operation === ChartOperation.IMPORT_RAW
      ) {
        // Show a popup with file input for CSV upload
        this.showCsvUploadAlert();
      }
    }
  }

  /**
   * Handles the mousedown event on the chart canvas
   * @param event The mousedown event
   */
  onMouseDown(event: MouseEvent) {
    if (this.chartMode !== ChartOperation.RANGE_SELECT_POINTS) {
      return;
    }

    this.isDragging = true;
    this.dragStartX = event.offsetX;

    // Clear previous selection if starting a new drag
    if (!event.ctrlKey && !event.shiftKey) {
      this.selectedPoints = [];
    }
  }

  /**
   * Handles the mousemove event on the chart canvas
   * @param event The mousemove event
   */
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging || this.chartMode !== ChartOperation.RANGE_SELECT_POINTS) {
      return;
    }

    this.dragEndX = event.offsetX;

    // Visual feedback could be added here (e.g., drawing a selection rectangle)
  }

  /**
   * Handles the mouseup event on the chart canvas
   * @param event The mouseup event
   */
  onMouseUp(event: MouseEvent) {
    if (!this.isDragging || this.chartMode !== ChartOperation.RANGE_SELECT_POINTS) {
      return;
    }

    this.dragEndX = event.offsetX;
    this.selectPointsInDragRange();

    // Reset drag state
    this.isDragging = false;
    this.dragStartX = null;
    this.dragEndX = null;
  }

  /**
   * Handles the mouseleave event on the chart canvas
   * @param event The mouseleave event
   */
  onMouseLeave(event: MouseEvent) {
    if (this.isDragging && this.chartMode === ChartOperation.RANGE_SELECT_POINTS) {
      this.dragEndX = event.offsetX;
      this.selectPointsInDragRange();

      // Reset drag state
      this.isDragging = false;
      this.dragStartX = null;
      this.dragEndX = null;
    }
  }

  /**
   * Shows a popup dialog for CSV upload
   */
  async showCsvUploadAlert() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Show confirmation dialog after file is selected
    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // Show confirmation dialog
        const alert = await this.alertController.create({
          header: 'Import CSV',
          message: `DANE ZOSTANĄ NADPISANE. Czy chcesz zaimportować plik "${file.name}"? `,
          buttons: [
            {
              text: 'Anuluj',
              role: 'cancel',
              handler: () => {
                document.body.removeChild(fileInput);
              }
            },
            {
              text: 'Importuj',
              handler: () => {
                this.uploadCsvFile(file);
                document.body.removeChild(fileInput);
              }
            }
          ]
        });

        await alert.present();
      } else {
        document.body.removeChild(fileInput);
      }
    };

    // Trigger file selection dialog
    fileInput.click();
  }

  /**
   * Uploads the selected CSV file to the backend
   * @param file The file to upload
   */
  async uploadCsvFile(file: File) {
    try {
      await this.toast('Importowanie danych...');

      this.dataService.importCsvData(file, this.sensorId.toString())
        .subscribe({
          next: (response) => {
            this.toast('Dane zostały zaimportowane pomyślnie');
            // Reload data to show the newly imported readings
            this.loadDataForSelectedPeriod();
          },
          error: (error) => {
            console.error('Error importing CSV:', error);
            this.toast('Wystąpił błąd podczas importowania danych');
          }
        });
    } catch (error) {
      console.error('Error uploading file:', error);
      await this.toast('Wystąpił błąd podczas przesyłania pliku');
    }
  }

  /**
   * Selects all points within the dragged range
   */
  private selectPointsInDragRange() {
    if (this.dragStartX === null || this.dragEndX === null || !this.chart?.chart) {
      return;
    }

    const chartInstance = this.chart.chart;
    const xScale = chartInstance.scales['x'];

    // Convert pixel coordinates to data values
    const startX = xScale.getValueForPixel(Math.min(this.dragStartX, this.dragEndX));
    const endX = xScale.getValueForPixel(Math.max(this.dragStartX, this.dragEndX));

    if (!startX || !endX) {
      return;
    }

    // Get all points from the chart data
    const chartPoints = this.chartData.datasets[0].data
      .filter((point: any) => point.data && point.data._id)
      .map((point: any) => ({
        id: point.data._id,
        timestamp: +point.data.timestamp
      }));

    // Select all points within the range
    const pointsInRange = chartPoints
      .filter(point => point.timestamp >= startX && point.timestamp <= endX)
      .map(point => point.id);

    // Add to existing selection or create new selection
    this.selectedPoints = [...new Set([...this.selectedPoints, ...pointsInRange])];

    if (this.selectedPoints.length > 0) {
      this.toast(`Zaznaczono ${this.selectedPoints.length} punktów`);
    }

    // Update chart to show selection
    this.buildChartOptions();
    this.chart.update();
  }
}
