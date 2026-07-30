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
	/** Minutes passed from midnight to the beginning of the log. */
	startTime: number;
	/**
	 * Minutes passed from midnight to the end of the log. A log crossing
	 * midnight ends on the next day, so the value can exceed 24 hours.
	 */
	endTime: number;
	title: string;
}

/** A pair of time logs sharing the same part of a day. */
export interface TimeLogsOverlap {
	first: TimeLog;
	second: TimeLog;
}
