import { moment, parseYaml } from "obsidian";

/** The way a day is written down while a range is being resolved. */
export const ISO_DATE_FORMAT = "YYYY-MM-DD";

export const QUERY_SETTING_FROM = "from";
export const QUERY_SETTING_TO = "to";
export const QUERY_SETTING_PERIOD = "period";

const QUERY_SETTINGS = [
	QUERY_SETTING_FROM,
	QUERY_SETTING_TO,
	QUERY_SETTING_PERIOD,
];

/**
 * A range of days a report is built for.
 *
 * Both bounds are inclusive and written in the ISO format, so they can be
 * compared with the dates of daily notes as plain strings. A bound is null
 * when it is not set: such a range is open on that side.
 */
export interface DateRange {
	from: string | null;
	to: string | null;
}

/**
 * The result of reading a timesheet query code block.
 *
 * A range is null when the block sets no dates at all — an empty block, or a
 * block whose settings could not be understood. The errors, when there are
 * any, describe what exactly is wrong with the block.
 */
export interface TimesheetQuery {
	range: DateRange | null;
	/**
	 * Whether the range is set relative to today, like "last-month" or "-7d".
	 * Such a range means other days tomorrow, so a report built from it is
	 * never known to be complete.
	 */
	relative: boolean;
	errors: string[];
}

type Moment = ReturnType<typeof moment>;

/** Units a period, or a bound written without a day, can be given in. */
type DateUnit = "year" | "month" | "day";

/** Units a shift from today can be given in. */
type ShiftUnit = "days" | "weeks" | "months" | "years";

interface UnitDate {
	date: Moment;
	unit: DateUnit;
}

const YEAR_PATTERN = /^\d{4}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A shift from today, like "-7d" (a week ago) or "+1m" (in a month). */
const OFFSET_PATTERN = /^([+-])(\d+)([dwmy])$/i;

const OFFSET_UNITS: Record<string, ShiftUnit> = {
	d: "days",
	w: "weeks",
	m: "months",
	y: "years",
};

/** Days a bound, or a period of a single day, can be set to by name. */
const NAMED_DAYS: Record<string, number> = {
	today: 0,
	yesterday: -1,
	tomorrow: 1,
};

/** Periods that are named rather than written down. */
const NAMED_PERIODS: Record<string, { unit: "week" | "month" | "year"; shift: number }> = {
	"this-week": { unit: "week", shift: 0 },
	"last-week": { unit: "week", shift: -1 },
	"this-month": { unit: "month", shift: 0 },
	"last-month": { unit: "month", shift: -1 },
	"this-year": { unit: "year", shift: 0 },
	"last-year": { unit: "year", shift: -1 },
};

const DATES_HINT = "a date (2026-07-01, 2026-07, 2026)";
const SHIFTS_HINT = "a shift from today (today, yesterday, tomorrow, -7d, +2w, -1m)";

/**
 * Reads the settings of a timesheet query code block.
 *
 * The block is written in YAML, so that it looks and behaves the way the
 * properties of a note do: `period` sets a whole range at once, while `from`
 * and `to` set its bounds one by one.
 */
export function parseTimesheetQuery(src: string): TimesheetQuery {
	const text = src.trim();

	if (text === "") {
		return { range: null, relative: false, errors: [] };
	}

	const impossible = findImpossibleDates(text);

	if (impossible.length > 0) {
		return {
			range: null,
			relative: false,
			errors: impossible.map(
				(date) => `"${date}" is not a date that exists.`
			),
		};
	}

	let data: unknown;

	try {
		data = parseYaml(text);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			range: null,
			relative: false,
			errors: [`The code block is not a valid YAML: ${message}`],
		};
	}

	if (data === null || data === undefined) {
		return { range: null, relative: false, errors: [] };
	}

	if (typeof data !== "object" || Array.isArray(data)) {
		return {
			range: null,
			relative: false,
			errors: [
				`The code block must be a list of settings, like "${QUERY_SETTING_PERIOD}: 2026-07".`,
			],
		};
	}

	return readSettings(data as Record<string, unknown>);
}

/**
 * Returns the dates written in the code block that are not the days they are
 * written as, like 2026-02-31.
 *
 * YAML turns a value looking like a date into a Date without checking it,
 * rolling the extra days over into the next month, so such a typo would
 * quietly become a report on a range nobody asked for — and by the time the
 * value is read, the day that was typed is gone. The dates are therefore
 * looked for in the text of the block as it was typed, wherever in it they
 * are: in quotes, in braces or in a comment they are written the same way.
 */
function findImpossibleDates(text: string): string[] {
	const dates = text.match(/\d{4}-\d{2}-\d{2}/g);

	if (dates === null) {
		return [];
	}

	const impossible: string[] = [];

	dates.forEach((date) => {
		if (isWrittenDay(date) || impossible.indexOf(date) !== -1) {
			return;
		}

		impossible.push(date);
	});

	return impossible;
}

/** Tells whether a date is the very day it is written as. */
function isWrittenDay(text: string): boolean {
	const date = new Date(
		Date.UTC(
			Number(text.slice(0, 4)),
			Number(text.slice(5, 7)) - 1,
			Number(text.slice(8, 10))
		)
	);

	// A day that doesn't exist is moved into the next month, and a year
	// below a hundred into the 20th century — exactly the way the YAML
	// reader moves them. A date surviving the trip unchanged is a date.
	return moment.utc(date).format(ISO_DATE_FORMAT) === text;
}

function readSettings(raw: Record<string, unknown>): TimesheetQuery {
	const errors: string[] = [];
	const empty = { range: null, relative: false, errors };

	const unknown = Object.keys(raw).filter(
		(key) => QUERY_SETTINGS.indexOf(key) === -1
	);

	if (unknown.length > 0) {
		errors.push(
			`Unknown ${unknown.length === 1 ? "setting" : "settings"}: ${unknown
				.map((key) => `"${key}"`)
				.join(", ")}. Available ones are ${QUERY_SETTINGS.map(
				(key) => `"${key}"`
			).join(", ")}.`
		);
	}

	const period = readSetting(raw, QUERY_SETTING_PERIOD, errors);
	const from = readSetting(raw, QUERY_SETTING_FROM, errors);
	const to = readSetting(raw, QUERY_SETTING_TO, errors);

	if (period !== "" && (from !== "" || to !== "")) {
		errors.push(
			`"${QUERY_SETTING_PERIOD}" cannot be used together with "${QUERY_SETTING_FROM}" and "${QUERY_SETTING_TO}": either name a period or set its bounds.`
		);

		return empty;
	}

	const range =
		period !== ""
			? resolvePeriod(period, errors)
			: resolveBounds(from, to, errors);

	if (errors.length > 0 || range === null) {
		return empty;
	}

	if (range.from !== null && range.to !== null && range.from > range.to) {
		errors.push(
			`The range is empty: "${QUERY_SETTING_FROM}" (${range.from}) is later than "${QUERY_SETTING_TO}" (${range.to}).`
		);

		return empty;
	}

	return {
		range,
		relative: isRelative(period) || isRelative(from) || isRelative(to),
		errors,
	};
}

/**
 * Tells whether a value is set relative to today rather than written down.
 *
 * Anything that is not a date is: the values a period or a bound can be
 * named by — "yesterday", "last-month", "-7d" — all count from today.
 */
function isRelative(text: string): boolean {
	return text !== "" && parseUnitDate(text) === null;
}

/**
 * Returns the value of a setting as a text.
 *
 * YAML turns a value looking like a date into a Date and a value looking like
 * a year into a number, so a value is brought back to the text the user typed
 * before it is resolved.
 */
function readSetting(
	raw: Record<string, unknown>,
	key: string,
	errors: string[]
): string {
	const value: unknown = raw[key];

	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value === "number") {
		return String(value);
	}

	if (value instanceof Date) {
		// A date without a time zone is read as midnight in UTC, so it is
		// formatted in UTC as well: a local time zone behind it would move
		// the value to the previous day.
		return moment.utc(value).format(ISO_DATE_FORMAT);
	}

	errors.push(`"${key}" must be ${DATES_HINT} or a period, written in a single line.`);

	return "";
}

/** Resolves a range set by its bounds, each of which is optional. */
function resolveBounds(
	from: string,
	to: string,
	errors: string[]
): DateRange | null {
	if (from === "" && to === "") {
		return null;
	}

	return {
		from: from === "" ? null : resolveBound(from, QUERY_SETTING_FROM, errors),
		to: to === "" ? null : resolveBound(to, QUERY_SETTING_TO, errors),
	};
}

/**
 * Resolves a bound of a range.
 *
 * A bound written without a day — a month or a year — is stretched towards
 * the outside of the range, so that `from: 2026-07` starts on the 1st of July
 * while `to: 2026-07` ends on the 31st.
 */
function resolveBound(
	text: string,
	key: string,
	errors: string[]
): string | null {
	const unitDate = parseUnitDate(text);

	if (unitDate !== null) {
		const date =
			key === QUERY_SETTING_FROM
				? unitDate.date.clone().startOf(unitDate.unit)
				: unitDate.date.clone().endOf(unitDate.unit);

		return date.format(ISO_DATE_FORMAT);
	}

	const relative = parseRelativeDay(text);

	if (relative !== null) {
		return relative.format(ISO_DATE_FORMAT);
	}

	errors.push(
		`"${key}" is set to "${text}", which is neither ${DATES_HINT} nor ${SHIFTS_HINT}.`
	);

	return null;
}

/** Resolves a range named or written down as a single value. */
function resolvePeriod(text: string, errors: string[]): DateRange | null {
	const unitDate = parseUnitDate(text);

	if (unitDate !== null) {
		return {
			from: unitDate.date.clone().startOf(unitDate.unit).format(ISO_DATE_FORMAT),
			to: unitDate.date.clone().endOf(unitDate.unit).format(ISO_DATE_FORMAT),
		};
	}

	const named = NAMED_PERIODS[text.toLowerCase()];

	if (named !== undefined) {
		const date = moment().add(named.shift, named.unit);

		return {
			from: date.clone().startOf(named.unit).format(ISO_DATE_FORMAT),
			to: date.clone().endOf(named.unit).format(ISO_DATE_FORMAT),
		};
	}

	// A shift from today names a single day, so it is a period as well: it
	// makes "period: yesterday" and "period: -1d" mean one and the same
	// thing, which is exactly what a reader of the block would expect.
	const day = parseRelativeDay(text);

	if (day !== null) {
		const value = day.format(ISO_DATE_FORMAT);

		return { from: value, to: value };
	}

	errors.push(
		`"${QUERY_SETTING_PERIOD}" is set to "${text}", which is neither ${DATES_HINT} nor a named period (this-week, last-week, this-month, last-month, this-year, last-year) nor ${SHIFTS_HINT}.`
	);

	return null;
}

/** Reads a year, a month or a day, remembering how exact the value is. */
function parseUnitDate(text: string): UnitDate | null {
	let unit: DateUnit;
	let format: string;

	if (YEAR_PATTERN.test(text)) {
		unit = "year";
		format = "YYYY";
	} else if (MONTH_PATTERN.test(text)) {
		unit = "month";
		format = "YYYY-MM";
	} else if (DAY_PATTERN.test(text)) {
		unit = "day";
		format = ISO_DATE_FORMAT;
	} else {
		return null;
	}

	const date = moment(text, format, true);

	return date.isValid() ? { date, unit } : null;
}

/** Reads a day named or set as a shift from today, like "today" or "-7d". */
function parseRelativeDay(text: string): Moment | null {
	const key = text.toLowerCase();
	const named = NAMED_DAYS[key];

	if (named !== undefined) {
		return moment().startOf("day").add(named, "days");
	}

	const offset = OFFSET_PATTERN.exec(key);

	if (offset === null) {
		return null;
	}

	const amount = Number(offset[2]) * (offset[1] === "-" ? -1 : 1);

	return moment().startOf("day").add(amount, OFFSET_UNITS[offset[3]]);
}
