export interface Task {
    timeLogs: TimeLog[];
	duration: number;
	number: string;
}

export interface TimeLog {
    taskNumber: string;
    interval: string;
    intervalString: string;
	duration: number;
	title: string;
}
