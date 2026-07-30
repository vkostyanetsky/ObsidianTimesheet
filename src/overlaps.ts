import { TimeLog, TimeLogsOverlap } from "./types";

const MINUTES_IN_DAY = 24 * 60;

export default class TimeLogsOverlaps {
	/**
	 * Returns pairs of time logs sharing the same part of a day.
	 *
	 * Logs are compared in the order they appear in a note, so the first log
	 * of a pair is always the one written earlier. Logs without a time
	 * interval are skipped: there is nothing to overlap.
	 */
	public static find(timeLogs: TimeLog[]): TimeLogsOverlap[] {
		const logs = timeLogs.filter((timeLog) => timeLog.duration > 0);
		const result: TimeLogsOverlap[] = [];

		logs.forEach((first, firstIndex) => {
			logs.slice(firstIndex + 1).forEach((second) => {
				if (this.areOverlapping(first, second)) {
					result.push({ first, second });
				}
			});
		});

		return result;
	}

	/**
	 * Logs merely touching each other, like 10:00-11:00 and 11:00-12:00, are
	 * not considered overlapping.
	 *
	 * A log crossing midnight ends on the next day, so the other log is also
	 * compared with itself shifted by a day in both directions. This way
	 * 23:00-02:00 is reported as overlapping 00:30-01:00.
	 */
	private static areOverlapping(first: TimeLog, second: TimeLog): boolean {
		return [-MINUTES_IN_DAY, 0, MINUTES_IN_DAY].some(
			(shift) =>
				first.startTime < second.endTime + shift &&
				second.startTime + shift < first.endTime
		);
	}
}
