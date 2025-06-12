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


export type HourlyReading = LiveReading &{
    max: number;
    min: number;
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
    to_timestamp?: string;
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
