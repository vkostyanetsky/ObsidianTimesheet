import { describe, expect, it } from "vitest";

import TimeLogsParser from "../src/parser";

const TASK_PATTERNS = ["TASK-\\d+"];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe("TimeLogsParser.timeLogs", () => {
	it("reads a task record with a time interval", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			"- [x] 10:00-11:30 TASK-1 writing tests",
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([
			{
				taskNumber: "TASK-1",
				interval: "10:00-11:30",
				intervalString: "10:00-11:30",
				duration: 90 * MINUTE,
				startTime: 600,
				endTime: 690,
				title: "10:00-11:30 TASK-1 writing tests",
			},
		]);
	});

	it("reads every record of a note, done or not", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			[
				"# A day",
				"",
				"- [x] 09:00-10:00 TASK-1 a",
				"- [ ] 10:00-11:00 TASK-2 b",
				"- [/] 11:00-12:00 TASK-3 c",
			].join("\n"),
			TASK_PATTERNS
		);

		expect(timeLogs.map((timeLog) => timeLog.taskNumber)).toEqual([
			"TASK-1",
			"TASK-2",
			"TASK-3",
		]);
	});

	it("ignores lines that are not task records", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			[
				"10:00-11:00 TASK-1 a plain line",
				"- 10:00-11:00 TASK-2 a list item without a checkbox",
				"- [x]10:00-11:00 TASK-3 no space after the checkbox",
			].join("\n"),
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([]);
	});

	it("ignores an indented task record", () => {
		// The reports are built out of top-level records only, even though the
		// editor decorations do highlight the nested ones.
		const timeLogs = TimeLogsParser.timeLogs(
			"    - [x] 10:00-11:00 TASK-1 a subtask",
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([]);
	});

	it("drops a record that neither names a task nor takes time", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			["- [ ] buy milk", "- [ ] "].join("\n"),
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([]);
	});

	it("keeps a record naming a task but taking no time", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			"- [ ] TASK-1 not started yet",
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([
			{
				taskNumber: "TASK-1",
				interval: "00:00-00:00",
				intervalString: "",
				duration: 0,
				startTime: 0,
				endTime: 0,
				title: "TASK-1 not started yet",
			},
		]);
	});

	it("keeps a record taking time but naming no task", () => {
		const timeLogs = TimeLogsParser.timeLogs(
			"- [x] 10:00-10:30 a break",
			TASK_PATTERNS
		);

		expect(timeLogs).toEqual([
			{
				taskNumber: "",
				interval: "10:00-10:30",
				intervalString: "10:00-10:30",
				duration: 30 * MINUTE,
				startTime: 600,
				endTime: 630,
				title: "10:00-10:30 a break",
			},
		]);
	});

	it("stretches a record crossing midnight into the next day", () => {
		const [timeLog] = TimeLogsParser.timeLogs(
			"- [x] 23:00-02:00 TASK-1 a night shift",
			TASK_PATTERNS
		);

		expect(timeLog.duration).toBe(3 * HOUR);
		expect(timeLog.interval).toBe("23:00-02:00");
		expect(timeLog.startTime).toBe(23 * 60);
		expect(timeLog.endTime).toBe(26 * 60);
	});

	it("pads the hours and the minutes of an interval", () => {
		const [timeLog] = TimeLogsParser.timeLogs(
			"- [x] 9:5 - 10:5 TASK-1 a",
			TASK_PATTERNS
		);

		expect(timeLog.interval).toBe("09:05-10:05");
		// The interval is remembered the way it was typed as well, so that it
		// can be cut out of the title of the record.
		expect(timeLog.intervalString).toBe("9:5 - 10:5");
		expect(timeLog.duration).toBe(HOUR);
	});

	it("reads an interval only at the beginning of a record", () => {
		const [timeLog] = TimeLogsParser.timeLogs(
			"- [x] TASK-1 met at 10:00-11:00",
			TASK_PATTERNS
		);

		expect(timeLog.duration).toBe(0);
		expect(timeLog.intervalString).toBe("");
	});

	it("trims the title of a record", () => {
		const [timeLog] = TimeLogsParser.timeLogs(
			"- [x]    TASK-1 a   ",
			TASK_PATTERNS
		);

		expect(timeLog.title).toBe("TASK-1 a");
	});
});

describe("TimeLogsParser.getTaskNumber", () => {
	it("returns the part of a title matching a pattern", () => {
		expect(
			TimeLogsParser.getTaskNumber("10:00-11:00 TASK-42 a", TASK_PATTERNS)
		).toBe("TASK-42");
	});

	it("returns an empty string when nothing matches", () => {
		expect(TimeLogsParser.getTaskNumber("a walk", TASK_PATTERNS)).toBe("");
	});

	it("returns an empty string when there are no patterns", () => {
		expect(TimeLogsParser.getTaskNumber("TASK-1", [])).toBe("");
	});

	it("uses the first pattern that matches, not the earliest match", () => {
		expect(
			TimeLogsParser.getTaskNumber("BUG-1 and TASK-1", [
				"TASK-\\d+",
				"BUG-\\d+",
			])
		).toBe("TASK-1");
	});
});
