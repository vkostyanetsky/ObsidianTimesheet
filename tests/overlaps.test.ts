import { describe, expect, it } from "vitest";

import TimeLogsOverlaps from "../src/overlaps";
import { TimeLog } from "../src/types";

const MINUTE = 60 * 1000;

/** Builds a time log the way the parser would, out of an interval of a day. */
function timeLog(interval: string, taskNumber = "TASK-1"): TimeLog {
	const [start, end] = interval.split("-");
	const minutes = (time: string) => {
		const [hours, rest] = time.split(":");

		return Number(hours) * 60 + Number(rest);
	};

	const startTime = minutes(start);
	// An interval ending earlier than it starts crosses midnight, so it ends
	// on the next day — exactly the way the parser reads it.
	const endTime = minutes(end) < startTime ? minutes(end) + 24 * 60 : minutes(end);

	return {
		taskNumber,
		interval,
		intervalString: interval,
		duration: (endTime - startTime) * MINUTE,
		startTime,
		endTime,
		title: `${interval} ${taskNumber}`,
	};
}

describe("TimeLogsOverlaps.find", () => {
	it("finds nothing in logs following each other", () => {
		expect(
			TimeLogsOverlaps.find([timeLog("09:00-10:00"), timeLog("11:00-12:00")])
		).toEqual([]);
	});

	it("does not count logs merely touching each other", () => {
		expect(
			TimeLogsOverlaps.find([timeLog("10:00-11:00"), timeLog("11:00-12:00")])
		).toEqual([]);
	});

	it("reports a pair in the order the logs are written in", () => {
		const first = timeLog("10:00-11:00", "TASK-1");
		const second = timeLog("10:30-11:30", "TASK-2");

		expect(TimeLogsOverlaps.find([first, second])).toEqual([
			{ first, second },
		]);
	});

	it("reports a log covered by another one", () => {
		const first = timeLog("10:00-12:00", "TASK-1");
		const second = timeLog("10:30-11:00", "TASK-2");

		expect(TimeLogsOverlaps.find([first, second])).toEqual([
			{ first, second },
		]);
	});

	it("reports every pair of overlapping logs", () => {
		const first = timeLog("10:00-13:00", "TASK-1");
		const second = timeLog("11:00-14:00", "TASK-2");
		const third = timeLog("12:00-15:00", "TASK-3");

		expect(TimeLogsOverlaps.find([first, second, third])).toEqual([
			{ first, second },
			{ first: first, second: third },
			{ first: second, second: third },
		]);
	});

	it("reports logs of one and the same task", () => {
		const first = timeLog("10:00-11:00", "TASK-1");
		const second = timeLog("10:30-11:30", "TASK-1");

		expect(TimeLogsOverlaps.find([first, second])).toEqual([
			{ first, second },
		]);
	});

	it("skips logs without a time interval", () => {
		const covering = timeLog("10:00-12:00");
		const untimed = timeLog("00:00-00:00", "TASK-2");

		expect(TimeLogsOverlaps.find([covering, untimed])).toEqual([]);
	});

	it("compares a log crossing midnight with the beginning of a day", () => {
		const night = timeLog("23:00-02:00", "TASK-1");
		const early = timeLog("00:30-01:00", "TASK-2");

		expect(TimeLogsOverlaps.find([night, early])).toEqual([
			{ first: night, second: early },
		]);
	});

	it("leaves a log crossing midnight alone when the days do not meet", () => {
		expect(
			TimeLogsOverlaps.find([
				timeLog("23:00-02:00", "TASK-1"),
				timeLog("03:00-04:00", "TASK-2"),
			])
		).toEqual([]);
	});

	it("finds nothing in a single log", () => {
		expect(TimeLogsOverlaps.find([timeLog("10:00-11:00")])).toEqual([]);
	});

	it("finds nothing in an empty note", () => {
		expect(TimeLogsOverlaps.find([])).toEqual([]);
	});
});
