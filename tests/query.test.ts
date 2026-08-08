import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { parseTimesheetQuery } from "../src/query";

/** The day the relative ranges of the tests are counted from: a Thursday. */
const TODAY = new Date(2026, 7, 6, 12, 0, 0);

beforeAll(() => {
	vi.useFakeTimers();
	vi.setSystemTime(TODAY);
});

afterAll(() => {
	vi.useRealTimers();
});

describe("parseTimesheetQuery: a block without a range", () => {
	it("reads an empty block", () => {
		expect(parseTimesheetQuery("")).toEqual({
			range: null,
			relative: false,
			errors: [],
		});
	});

	it("reads a block of blank lines", () => {
		expect(parseTimesheetQuery("\n   \n")).toEqual({
			range: null,
			relative: false,
			errors: [],
		});
	});

	it("reads a block of comments", () => {
		expect(parseTimesheetQuery("# nothing to see here")).toEqual({
			range: null,
			relative: false,
			errors: [],
		});
	});
});

describe("parseTimesheetQuery: a period", () => {
	it("stretches a year over its months", () => {
		expect(parseTimesheetQuery("period: 2026")).toEqual({
			range: { from: "2026-01-01", to: "2026-12-31" },
			relative: false,
			errors: [],
		});
	});

	it("stretches a month over its days", () => {
		expect(parseTimesheetQuery("period: 2026-07")).toEqual({
			range: { from: "2026-07-01", to: "2026-07-31" },
			relative: false,
			errors: [],
		});
	});

	it("reads a day as a range of one day", () => {
		expect(parseTimesheetQuery("period: 2026-07-01")).toEqual({
			range: { from: "2026-07-01", to: "2026-07-01" },
			relative: false,
			errors: [],
		});
	});

	it("reads a quoted day the same way as a bare one", () => {
		expect(parseTimesheetQuery('period: "2026-07-01"').range).toEqual({
			from: "2026-07-01",
			to: "2026-07-01",
		});
	});

	it("reads a named month", () => {
		expect(parseTimesheetQuery("period: last-month")).toEqual({
			range: { from: "2026-07-01", to: "2026-07-31" },
			relative: true,
			errors: [],
		});
	});

	it("reads a named week", () => {
		expect(parseTimesheetQuery("period: this-week").range).toEqual({
			from: "2026-08-02",
			to: "2026-08-08",
		});
	});

	it("reads a named year", () => {
		expect(parseTimesheetQuery("period: last-year").range).toEqual({
			from: "2025-01-01",
			to: "2025-12-31",
		});
	});

	it("reads a named period no matter the case", () => {
		expect(parseTimesheetQuery("period: Last-Month").range).toEqual({
			from: "2026-07-01",
			to: "2026-07-31",
		});
	});

	it("reads a named day as a range of one day", () => {
		expect(parseTimesheetQuery("period: yesterday")).toEqual({
			range: { from: "2026-08-05", to: "2026-08-05" },
			relative: true,
			errors: [],
		});
	});

	it("reads a shift from today as a range of one day", () => {
		expect(parseTimesheetQuery("period: -7d")).toEqual({
			range: { from: "2026-07-30", to: "2026-07-30" },
			relative: true,
			errors: [],
		});
	});

	it("reads every unit a shift can be given in", () => {
		expect(parseTimesheetQuery("period: +2w").range?.from).toBe("2026-08-20");
		expect(parseTimesheetQuery("period: -1m").range?.from).toBe("2026-07-06");
		expect(parseTimesheetQuery("period: -1y").range?.from).toBe("2025-08-06");
	});
});

describe("parseTimesheetQuery: bounds", () => {
	it("reads both bounds", () => {
		expect(parseTimesheetQuery("from: 2026-07-01\nto: 2026-07-15")).toEqual({
			range: { from: "2026-07-01", to: "2026-07-15" },
			relative: false,
			errors: [],
		});
	});

	it("stretches the bounds towards the outside of the range", () => {
		expect(parseTimesheetQuery("from: 2026-07\nto: 2026-08").range).toEqual({
			from: "2026-07-01",
			to: "2026-08-31",
		});
	});

	it("leaves a range open on the side that is not set", () => {
		expect(parseTimesheetQuery("from: 2026-07-01").range).toEqual({
			from: "2026-07-01",
			to: null,
		});

		expect(parseTimesheetQuery("to: 2026-07-01").range).toEqual({
			from: null,
			to: "2026-07-01",
		});
	});

	it("reads a bound set relative to today", () => {
		expect(parseTimesheetQuery("from: -7d\nto: today")).toEqual({
			range: { from: "2026-07-30", to: "2026-08-06" },
			relative: true,
			errors: [],
		});
	});

	it("counts a range with one relative bound as relative", () => {
		expect(parseTimesheetQuery("from: 2026-07-01\nto: today").relative).toBe(
			true
		);
	});

	it("ignores a bound that is set to nothing", () => {
		expect(parseTimesheetQuery("from: 2026-07-01\nto:")).toEqual({
			range: { from: "2026-07-01", to: null },
			relative: false,
			errors: [],
		});
	});
});

describe("parseTimesheetQuery: mistakes", () => {
	it("refuses a day that does not exist", () => {
		expect(parseTimesheetQuery("period: 2026-02-31")).toEqual({
			range: null,
			relative: false,
			errors: ['"2026-02-31" is not a date that exists.'],
		});
	});

	it("refuses a day that does not exist even in quotes", () => {
		expect(parseTimesheetQuery('from: "2026-06-31"').errors).toEqual([
			'"2026-06-31" is not a date that exists.',
		]);
	});

	it("reports a day that does not exist once", () => {
		expect(
			parseTimesheetQuery("from: 2026-02-31\nto: 2026-02-31").errors
		).toEqual(['"2026-02-31" is not a date that exists.']);
	});

	it("refuses a block that is not a valid YAML", () => {
		const { range, errors } = parseTimesheetQuery('period: "unclosed');

		expect(range).toBeNull();
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatch(/^The code block is not a valid YAML: /);
	});

	it("refuses a block that is not a list of settings", () => {
		const message =
			'The code block must be a list of settings, like "period: 2026-07".';

		expect(parseTimesheetQuery("just some text").errors).toEqual([message]);
		expect(parseTimesheetQuery("- 2026-07\n- 2026-08").errors).toEqual([
			message,
		]);
	});

	it("refuses a setting it does not know", () => {
		expect(parseTimesheetQuery("month: 2026-07").errors).toEqual([
			'Unknown setting: "month". Available ones are "from", "to", "period".',
		]);
	});

	it("lists every setting it does not know", () => {
		expect(parseTimesheetQuery("month: 2026-07\nyear: 2026").errors).toEqual([
			'Unknown settings: "month", "year". Available ones are "from", "to", "period".',
		]);
	});

	it("refuses a period used together with a bound", () => {
		expect(parseTimesheetQuery("period: 2026-07\nfrom: 2026-07-01")).toEqual({
			range: null,
			relative: false,
			errors: [
				'"period" cannot be used together with "from" and "to": either name a period or set its bounds.',
			],
		});
	});

	it("refuses a period it cannot resolve", () => {
		expect(parseTimesheetQuery("period: last-fortnight").errors).toEqual([
			'"period" is set to "last-fortnight", which is neither a date (2026-07-01, 2026-07, 2026) nor a named period (this-week, last-week, this-month, last-month, this-year, last-year) nor a shift from today (today, yesterday, tomorrow, -7d, +2w, -1m).',
		]);
	});

	it("refuses a bound it cannot resolve", () => {
		expect(parseTimesheetQuery("from: soon").errors).toEqual([
			'"from" is set to "soon", which is neither a date (2026-07-01, 2026-07, 2026) nor a shift from today (today, yesterday, tomorrow, -7d, +2w, -1m).',
		]);
	});

	it("refuses a setting that is not a single value", () => {
		expect(parseTimesheetQuery("from:\n  - 2026-07-01").errors).toEqual([
			'"from" must be a date (2026-07-01, 2026-07, 2026) or a period, written in a single line.',
		]);
	});

	it("refuses a range ending before it starts", () => {
		expect(parseTimesheetQuery("from: 2026-08-01\nto: 2026-07-01")).toEqual({
			range: null,
			relative: false,
			errors: [
				'The range is empty: "from" (2026-08-01) is later than "to" (2026-07-01).',
			],
		});
	});

	it("accepts a range of a single day set by its bounds", () => {
		expect(parseTimesheetQuery("from: 2026-07-01\nto: 2026-07-01").range).toEqual(
			{ from: "2026-07-01", to: "2026-07-01" }
		);
	});
});
