export type LiveReading = {
    id: number,
    timestamp: string,
    value: number;
    sensorId: number;
    delta: number;
    isReset?: boolean;
    isConnectionFailure?: boolean;
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
    average60: number,
}


export type HourlyReading = LiveReading & {
    max: number;
    min: number;
    workStartTime: string;
    workEndTime: string;
    average: number;
}

export enum WorkingPeriodType {
    LIVE = 'live',
    HOURLY = 'hourly',
}

export type WorkingPeriod = {
    id: number;
    sensorId: number;
    start: string;
    end: string | null;
    isManuallyCorrected: boolean;
    type: WorkingPeriodType;
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

export interface GrowingAverageBase {
    estimatedProduction: number;
    realProduction: number;
}

export interface GrowingAverage extends GrowingAverageBase {
    sensorId: number;
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
    end: string | null;
    totalTime: number;
    totalUnits: number;
    accidents: AnnotationStats;
    breaks: AnnotationStats;
    organisations: AnnotationStats;
    clipsChanges: AnnotationStats;
    estimatedProduction: number
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

export const getPolishDayKey = (timestamp: number | string): string => {
    const date = new Date(+timestamp);
    const formatter = new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const [{value: day}, , {value: month}, , {value: year}] = formatter.formatToParts(date);
    return `${year}-${month}-${day}`; // e.g. "2025-06-23"
};

const addAnnotationStats = (a: AnnotationStats, b: AnnotationStats): AnnotationStats => ({
    count: a.count + b.count,
    totalDurationMs: a.totalDurationMs + b.totalDurationMs
});

export const addGrowingAverageLive = (readings: LiveReading[], hourlyTarget: number): LiveReading[] => {
    const firstReadingWithValue = readings.find(r => r.delta >= 5);

    if (!firstReadingWithValue || !hourlyTarget) {
        console.error('no first reading, or hourly target');
        return readings;
    }

    readings = readings.map(r => {
        const minutesSinceFirstReading = Math.floor(
            (+r.timestamp - +firstReadingWithValue.timestamp) / 60000,
        );

        const estimatedProduction = minutesSinceFirstReading * (hourlyTarget / 60);
        const realProduction = r.dailyTotal || 0;

        return {
            ...r,
            growingAverage: {
                realProduction,
                estimatedProduction,
                endTime: r.timestamp,
                fromTime: firstReadingWithValue.timestamp,
                sensorId: r.sensorId
            }
        }
    })

    return readings
}

export const addGrowingAverageHourly = (groupedReadings: HourlyReading[][], hourlyTarget: number): HourlyReading[] => {
    let readings: Array<HourlyReading & { isFirstInPeriod: boolean, isLastInPeriod: boolean }> = [];
    groupedReadings.forEach(grReadings => {
        readings.push(...grReadings.map((r, idx) => ({
            ...r, isFirstInPeriod: idx === 0, isLastInPeriod: idx === grReadings.length - 1,
        })))
    });

    const firstReadingWithValueIdx = readings.findIndex(r => r.delta >= 5);
    const lastReadingWithValueIdx = [...readings].reverse().findIndex(r => r.delta >= 5);

    let firstReadingInWorkPeriod = firstReadingWithValueIdx;

    let lastPeriodEstimate = 0;

    if (firstReadingWithValueIdx === -1 || !hourlyTarget || lastReadingWithValueIdx === -1) {
        console.error('no first reading, or hourly target');
        return readings;
    }

    const sumUpToIndex = (targetIndex: number) => {
        return readings.slice(firstReadingWithValueIdx, targetIndex + 1).reduce((a, b) => {
            return a + b.delta
        }, 0);
    }

    readings = readings.map(((r, idx) => {
        if(r.isFirstInPeriod) {
            firstReadingInWorkPeriod = idx;
        }


        const isLastReadingInRange = readings[idx].isFirstInPeriod

        const endTime = isLastReadingInRange ? r.workEndTime : r.timestamp;

        const minutesSinceFirstReading = Math.floor(
            (+endTime - +readings[firstReadingInWorkPeriod].workStartTime) / 60000,
        );

        const currentEstimate = lastPeriodEstimate + Math.round(minutesSinceFirstReading * (hourlyTarget / 60));

        if(r.isLastInPeriod) {
            lastPeriodEstimate = currentEstimate;
        }

        return {
            ...r,
            growingAverage: {
                realProduction: r.dailyTotal ?? sumUpToIndex(idx),
                estimatedProduction: currentEstimate,
                endTime: r.timestamp,
                fromTime: readings[firstReadingWithValueIdx].timestamp,
                sensorId: r.sensorId
            }
        }
    }));

    return readings
}

// export const getSummaryForMultipleDays = (
//     readings: LiveReading[] | HourlyReading[],
//     annotations: Annotation[] = []
// ): DailyWorkingSummary | null => {
//
//     const readingsByDay = groupBy(readings, r => getPolishDayKey(r.timestamp));
//     const annotationsByDay = groupBy(annotations, a => getPolishDayKey(a.from_timestamp));
//
//     const dailySummaries: DailyWorkingSummary[] = [];
//
//     for (const day in readingsByDay) {
//         const dayReadings = readingsByDay[day];
//         const dayAnnotations = annotationsByDay[day] || [];
//
//         const summary = getDailyWorkingSummary(dayReadings, dayAnnotations, true);
//         if (summary) dailySummaries.push(summary);
//     }
//
//     if (dailySummaries.length === 0) return null;
//
//     const totalSummary: DailyWorkingSummary = {
//         start: '', // Optional to fill
//         end: '',   // Optional to fill
//         totalTime: 0,
//         breaks: {count: 0, totalDurationMs: 0},
//         accidents: {count: 0, totalDurationMs: 0},
//         organisations: {count: 0, totalDurationMs: 0},
//         clipsChanges: {count: 0, totalDurationMs: 0}
//     };
//
//     for (const summary of dailySummaries) {
//         totalSummary.totalTime += summary.totalTime;
//         totalSummary.breaks = addAnnotationStats(totalSummary.breaks, summary.breaks);
//         totalSummary.accidents = addAnnotationStats(totalSummary.accidents, summary.accidents);
//         totalSummary.organisations = addAnnotationStats(totalSummary.organisations, summary.organisations);
//         totalSummary.clipsChanges = addAnnotationStats(totalSummary.clipsChanges, summary.clipsChanges);
//     }
//
//     return totalSummary;
// }

//
// export const getStartWorkingTime = (readings: LiveReading[] | HourlyReading[]): number | null => {
//     const sorted = readings.sort((a, b) => +a.timestamp - +b.timestamp)
//     const firstReadingWithValueIndex = sorted.findIndex(r => r.delta >= 5);
//     return firstReadingWithValueIndex !== -1 ? +sorted[firstReadingWithValueIndex].timestamp : null;
// }
//
// export const getLastWorkingTime = (readings: LiveReading[] | HourlyReading[]): number | null => {
//     const sorted = readings.sort((a, b) => +b.timestamp - +a.timestamp);
//     const firstReadingWithValueIndex = sorted.findIndex(r => r.delta >= 5);
//     return firstReadingWithValueIndex !== -1 ? +sorted[firstReadingWithValueIndex].timestamp : null;
// }

export const getDailyWorkingSummary = (
    readings: LiveReading[] | HourlyReading[],
    annotations: Annotation[] = [],
    workPeriods: WorkingPeriod[] = [],
    hourlyTarget: number = 5250,
    fixedStartTS?: string,
    fixedEndTS?: string // Todo to implement on monthly stats
): DailyWorkingSummary | null => {
    let start: string, end: string | null = null;

    const summaries = workPeriods.map((period): DailyWorkingSummary => {
        start = fixedStartTS && +fixedStartTS > +period.start ? fixedStartTS : period.start;

        if ((fixedEndTS && !period.end) || (fixedEndTS && period.end && +fixedEndTS < +period.end)) {
            end = fixedEndTS;
        } else {
            end = period.end;
        }

        const filteredReadings = readings
            .sort((a, b) => +a.timestamp - +b.timestamp)
            .filter(r => {
                let tickStart: number, tickEnd: number;

                if (r.hasOwnProperty("workStartTime")) {
                    tickStart = +(r as HourlyReading).workStartTime;
                    tickEnd = +(r as HourlyReading).workStartTime;
                } else {
                    tickStart = +r.timestamp;
                    tickEnd = +r.timestamp;
                }
                if (end != null) {
                    return tickStart >= +start && tickEnd <= +end;
                } else {
                    return tickStart >= +start;
                }
            });

        const annotationsInTimeframe = annotations
            .filter(ann => +ann.from_timestamp >= +start && (!end || +ann.to_timestamp <= +end))
            .map(ann => {
                if (end && ann.to_timestamp > end) {
                    return {...ann, toTimestamp: end}; // cut annotation to fit into workperiod
                }
                return ann
            })


        const annotationStats = calculateAnnotationStats(annotationsInTimeframe);

        const totalUnits = filteredReadings.reduce((prev, curr) => curr.delta + prev, 0);
        const lastReadingTs = Math.max(...filteredReadings.map(r => {
            return r.hasOwnProperty("workEndTime") ? +(r as HourlyReading).workEndTime : +r.timestamp
        }));

        const totalTime = ((end ? +end : lastReadingTs) - +start);

        return {
            start: start, end: end,
            totalTime: totalTime,
            totalUnits: totalUnits,
            estimatedProduction: totalTime / (1000 * 60 * 60) * (hourlyTarget),
            breaks: annotationStats[AnnotationType.BREAK_FROM_TO],
            accidents: annotationStats[AnnotationType.ACCIDENT_FROM_TO],
            organisations: annotationStats[AnnotationType.ORGANISATION_FROM_TO],
            clipsChanges: annotationStats[AnnotationType.CLIPS_CHANGE]
        }
    });


    if (summaries.length === 0) return null;

    if (summaries.length === 1) {
        return summaries[0];
    } else {
        return sumDailySummaries(summaries)
    }

}

export const sumDailySummaries = (summaries: DailyWorkingSummary[]): DailyWorkingSummary => {
    const totalSummary: DailyWorkingSummary = {
        start: '', // Optional to fill
        end: '',   // Optional to fill
        totalTime: 0,
        totalUnits: 0,
        estimatedProduction: 0,
        breaks: {count: 0, totalDurationMs: 0},
        accidents: {count: 0, totalDurationMs: 0},
        organisations: {count: 0, totalDurationMs: 0},
        clipsChanges: {count: 0, totalDurationMs: 0}
    };

    totalSummary.start = summaries[0].start;
    totalSummary.end = summaries[summaries.length - 1].end ?? ''

    for (const summary of summaries) {
        totalSummary.totalTime += summary.totalTime;
        totalSummary.totalUnits += summary.totalUnits;
        totalSummary.estimatedProduction += summary.estimatedProduction;
        totalSummary.breaks = addAnnotationStats(totalSummary.breaks, summary.breaks);
        totalSummary.accidents = addAnnotationStats(totalSummary.accidents, summary.accidents);
        totalSummary.organisations = addAnnotationStats(totalSummary.organisations, summary.organisations);
        totalSummary.clipsChanges = addAnnotationStats(totalSummary.clipsChanges, summary.clipsChanges);
    }

    return totalSummary;
}


export const calculateAnnotationStats = (annotations: Annotation[]): Record<AnnotationType, AnnotationStats> => {
    const stats: Record<AnnotationType, AnnotationStats> = {
        [AnnotationType.BREAK_FROM_TO]: {count: 0, totalDurationMs: 0},
        [AnnotationType.ACCIDENT_FROM_TO]: {count: 0, totalDurationMs: 0},
        [AnnotationType.ORGANISATION_FROM_TO]: {count: 0, totalDurationMs: 0},
        [AnnotationType.CLIPS_CHANGE]: {count: 0, totalDurationMs: 0},
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
    if (!dailyWorkingStats) {
        return 0
    }
    const plannedBreaks = dailyWorkingStats?.breaks.totalDurationMs + dailyWorkingStats?.organisations.totalDurationMs + dailyWorkingStats?.clipsChanges.totalDurationMs;
    const accidents = dailyWorkingStats.accidents.totalDurationMs;

    if (dailyWorkingStats.accidents.count === 0) {
        return dailyWorkingStats.totalTime;
    }

    return (dailyWorkingStats.totalTime - plannedBreaks - accidents) / dailyWorkingStats.accidents.count
}

export const MTTR = (dailyWorkingStats: DailyWorkingSummary): number => {
    if (!dailyWorkingStats || dailyWorkingStats.accidents.count === 0) {
        return 0
    }
    return dailyWorkingStats.accidents.totalDurationMs / dailyWorkingStats.accidents.count
}


export const getAnnotationTitle = (annotationType: AnnotationType): string => {
    switch (annotationType) {
        case AnnotationType.BREAK_FROM_TO:
            return 'P';
        case AnnotationType.ACCIDENT_FROM_TO:
            return 'A'
        case AnnotationType.ORGANISATION_FROM_TO:
            return 'O';
        case AnnotationType.CLIPS_CHANGE:
            return 'W';
        default:
            return ''
    }
}
