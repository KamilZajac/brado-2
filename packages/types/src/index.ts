export type LiveReading = {
    timestamp: string,
    value: number;
    sensorId: number;
    delta: number;
    dailyTotal?: number; // virtual field
    growingAverage?: GrowingAverage; // virtual
}

export type DataReadingWithDeltas = LiveReading & {
    previous: number | null,
    deltaFromPrevious: number | null,
    todayStart: number | null,
    deltaToday: number | null,
}

export type LiveUpdate = {
    [key: string]: LiveSensorUpdate;
}

export type LiveSensorUpdate = {
    readings: LiveReading[]
    growingAverage: GrowingAverage
    average60 : number,
}


export type HourlyReading = LiveReading & {
    max: number;
    min: number;
    workStartTime: string;
    workEndTime: string;
    average: number;
}

export interface SettingsRequest {
    hourlyTarget: number;
    sensorNames: string[];
}


export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    WORKER = 'worker',
}

export interface User {
    id: number;
    username: string;
    role: UserRole;
}

export interface CreateUser {
    username: string;
    role: UserRole;
    password: string;
}

export interface Annotation {
    id: number;
    from_timestamp: string;
    to_timestamp: string;
    text: string;
    sensorId: number;
    user: User;
    type: AnnotationType;
}


export interface GrowingAverage {
    sensorId:  number;
    estimatedProduction: number;
    realProduction: number;
    fromTime: string,
    endTime: string,
}

export enum AnnotationType {
    BREAK_FROM_TO, ACCIDENT_FROM_TO, ORGANISATION_FROM_TO, CLIPS_CHANGE
}


export interface TempReading {
    id: number;
    sensorId: string;
    temperature: number;
    humidity: number;
    dewPoint: number;
    timestamp: string;
}

type AnnotationStats = {
    count: number;
    totalDurationMs: number;
};
export interface DailyWorkingSummary {
    start: string;
    end: string;
    totalTime: number;
    accidents: AnnotationStats;
    breaks: AnnotationStats;
    organisations: AnnotationStats;
    clipsChanges: AnnotationStats;
}


export function groupBy<T>(array: T[], getKey: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of array) {
        const key = getKey(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
    }
    return result;
}
const getPolishDayKey = (timestamp: number | string): string => {
    const date = new Date(+timestamp);
    const formatter = new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const [{ value: day }, , { value: month }, , { value: year }] = formatter.formatToParts(date);
    return `${year}-${month}-${day}`; // e.g. "2025-06-23"
};

const addAnnotationStats = (a: AnnotationStats, b: AnnotationStats): AnnotationStats => ({
    count: a.count + b.count,
    totalDurationMs: a.totalDurationMs + b.totalDurationMs
});

export const addGrowingAverage = (readings: LiveReading[], hourlyTarget: number): LiveReading[] => {
    const firstReadingWithValue = readings.find(r => r.delta >= 5);

    if(!firstReadingWithValue || !hourlyTarget) {
        console.error('no first reading, or hourly target');
        return readings;
    }

    readings = readings.map(r => {
        const minutesSinceFirstReading = Math.floor(
            (+r.timestamp - +firstReadingWithValue.timestamp) / 60000,
        );

        const estimatedProduction = minutesSinceFirstReading * (hourlyTarget/60);
        const realProduction = r.dailyTotal || 0;

        return {
            ...r,
            growingAverage: {
                realProduction, estimatedProduction, endTime: r.timestamp, fromTime: firstReadingWithValue.timestamp, sensorId: r.sensorId
            }
        }
    })

    return readings
}

export const getSummaryForMultipleDays = (
    readings: LiveReading[] | HourlyReading[],
    annotations: Annotation[] = []
): DailyWorkingSummary | null => {

    const readingsByDay = groupBy(readings, r => getPolishDayKey(r.timestamp));
    const annotationsByDay = groupBy(annotations, a => getPolishDayKey(a.from_timestamp));

    const dailySummaries: DailyWorkingSummary[] = [];

    for (const day in readingsByDay) {
        const dayReadings = readingsByDay[day];
        const dayAnnotations = annotationsByDay[day] || [];

        const summary = getDailyWorkingSummary(dayReadings, dayAnnotations, true);
        if (summary) dailySummaries.push(summary);
    }

    if (dailySummaries.length === 0) return null;

    const totalSummary: DailyWorkingSummary = {
        start: '', // Optional to fill
        end: '',   // Optional to fill
        totalTime: 0,
        breaks: { count: 0, totalDurationMs: 0 },
        accidents: { count: 0, totalDurationMs: 0 },
        organisations: { count: 0, totalDurationMs: 0 },
        clipsChanges: { count: 0, totalDurationMs: 0 }
    };

    for (const summary of dailySummaries) {
        console.log(dailySummaries)
        totalSummary.totalTime += summary.totalTime;
        totalSummary.breaks = addAnnotationStats(totalSummary.breaks, summary.breaks);
        totalSummary.accidents = addAnnotationStats(totalSummary.accidents, summary.accidents);
        totalSummary.organisations = addAnnotationStats(totalSummary.organisations, summary.organisations);
        totalSummary.clipsChanges = addAnnotationStats(totalSummary.clipsChanges, summary.clipsChanges);
    }

    return totalSummary;
}


export const getStartWorkingTime = (readings: LiveReading[] | HourlyReading[]): number | null => {
    const firstReadingWithValueIndex = readings.sort((a, b) => +a.timestamp - +b.timestamp).findIndex(r => r.delta >= 5);
    return firstReadingWithValueIndex ? +readings[firstReadingWithValueIndex -1].timestamp : null;
}

export const getLastWorkingTime = (readings: LiveReading[] | HourlyReading[]): number | null => {
    const firstReadingWithValue = readings.sort((a, b) => +b.timestamp - +a.timestamp).find(r => r.delta >= 5);
    return firstReadingWithValue ? +firstReadingWithValue.timestamp : null;
}

export const getDailyWorkingSummary  = (readings: LiveReading[] | HourlyReading[], annotations: Annotation[] = [], isHourly = false): DailyWorkingSummary | null => {

    let start, end;
    if(isHourly) {
        const startWorkingTs = (readings as HourlyReading[]).map(r => +r.workStartTime).filter(t => t > 0);
        const endWorkingTs = (readings as HourlyReading[]).map(r => +r.workEndTime).filter(t => t > 0);
        start = Math.min(...startWorkingTs)
        end = Math.max(...endWorkingTs)

    } else {
        start = getStartWorkingTime(readings);
        end = getLastWorkingTime(readings);
    }

    console.log(start, end);
    if(!start || !end) {
        return null
    }

    const annotationsInTimeframe = annotations.filter(ann => +ann.from_timestamp >= +start && ann.to_timestamp &&  +ann.to_timestamp <= +end );

    const annotationStats = calculateAnnotationStats(annotationsInTimeframe);

    return {
        start: start.toString(), end: end.toString(), totalTime: end - start,
        breaks: annotationStats[AnnotationType.BREAK_FROM_TO],
        accidents: annotationStats[AnnotationType.ACCIDENT_FROM_TO],
        organisations: annotationStats[AnnotationType.ORGANISATION_FROM_TO],
        clipsChanges: annotationStats[AnnotationType.CLIPS_CHANGE]
    }
}


export const calculateAnnotationStats = (annotations: Annotation[]): Record<AnnotationType, AnnotationStats> => {
    const stats: Record<AnnotationType, AnnotationStats> = {
        [AnnotationType.BREAK_FROM_TO]: { count: 0, totalDurationMs: 0 },
        [AnnotationType.ACCIDENT_FROM_TO]: { count: 0, totalDurationMs: 0 },
        [AnnotationType.ORGANISATION_FROM_TO]: { count: 0, totalDurationMs: 0 },
        [AnnotationType.CLIPS_CHANGE]: { count: 0, totalDurationMs: 0 },
    };

    for (const annotation of annotations) {
        const type = annotation.type;
        stats[type].count++;

        if (annotation.to_timestamp) {
            const from = +annotation.from_timestamp;
            const to = +annotation.to_timestamp
            const duration = to - from;

            if (duration > 0) {
                stats[type].totalDurationMs += duration;
            }
        }
    }

    return stats;
}



export const MTBF = (dailyWorkingStats: DailyWorkingSummary): number => {
    if(!dailyWorkingStats) {
        return 0
    }
    const plannedBreaks = dailyWorkingStats?.breaks.totalDurationMs + dailyWorkingStats?.organisations.totalDurationMs + dailyWorkingStats?.clipsChanges.totalDurationMs;
    const accidents = dailyWorkingStats.accidents.totalDurationMs;

    if(dailyWorkingStats.accidents.count === 0) {
        return dailyWorkingStats.totalTime;
    }

    return ( dailyWorkingStats.totalTime - plannedBreaks - accidents)  / dailyWorkingStats.accidents.count
}

export const MTTR = (dailyWorkingStats: DailyWorkingSummary): number  => {
    if(!dailyWorkingStats || dailyWorkingStats.accidents.count === 0) {
        return 0
    }
    return dailyWorkingStats.accidents.totalDurationMs / dailyWorkingStats.accidents.count
}
