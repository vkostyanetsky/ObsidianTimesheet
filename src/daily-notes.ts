import { App, TFile, moment, normalizePath } from "obsidian";
import { DateRange, ISO_DATE_FORMAT } from "./query";

/** The file the Daily notes core plugin keeps its settings in. */
const DAILY_NOTES_SETTINGS_FILE = "daily-notes.json";

/** The date format the Daily notes core plugin uses until it is changed. */
const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";

const MARKDOWN_EXTENSION = ".md";

export interface DailyNotesSettings {
	/** The "New file location" setting; an empty value means the vault root. */
	folder: string;
	/** The "Date format" setting, which daily notes are named after. */
	format: string;
}

export interface DailyNote {
	file: TFile;
	/** The day the note belongs to, in the ISO format. */
	date: string;
}

/**
 * Reads the settings of the Daily notes core plugin.
 *
 * The settings are read from the configuration file rather than taken from
 * the plugin itself, since Obsidian doesn't expose core plugins to community
 * ones. A missing or unreadable file is not a failure: the core plugin writes
 * it only after its settings are changed, so the defaults of Obsidian are
 * used until then.
 */
export async function readDailyNotesSettings(
	app: App
): Promise<DailyNotesSettings> {
	const path = normalizePath(
		`${app.vault.configDir}/${DAILY_NOTES_SETTINGS_FILE}`
	);

	let raw: Record<string, unknown> = {};

	try {
		if (await app.vault.adapter.exists(path)) {
			const data: unknown = JSON.parse(await app.vault.adapter.read(path));

			if (data !== null && typeof data === "object") {
				raw = data as Record<string, unknown>;
			}
		}
	} catch {
		// Neither a missing file nor a broken one is worth reporting: a
		// vault where the core plugin was never set up is a normal vault.
		raw = {};
	}

	return {
		folder: typeof raw.folder === "string" ? normalizeFolder(raw.folder) : "",
		format: typeof raw.format === "string" && raw.format.trim() !== ""
			? raw.format.trim()
			: DEFAULT_DAILY_NOTE_FORMAT,
	};
}

/**
 * Returns the daily notes belonging to the days of a range, ordered from the
 * earliest day to the latest one.
 *
 * A note is considered a daily one when it lies in the folder of the core
 * plugin and its name is a date written in the format of the core plugin. A
 * format containing slashes is not an exception: the whole path of a note
 * inside the folder is read as a date, so notes kept in subfolders by year or
 * by month are found as well.
 */
export function findDailyNotes(
	app: App,
	settings: DailyNotesSettings,
	range: DateRange
): DailyNote[] {
	const notes: DailyNote[] = [];

	app.vault.getMarkdownFiles().forEach((file) => {
		const date = getDailyNoteDate(settings, file.path);

		if (date === null || !isWithinRange(range, date)) {
			return;
		}

		notes.push({ file, date });
	});

	notes.sort((first, second) => {
		if (first.date !== second.date) {
			return first.date < second.date ? -1 : 1;
		}

		return first.file.path < second.file.path ? -1 : 1;
	});

	return notes;
}

/**
 * Returns the day a note belongs to, or null when the note is not a daily
 * one.
 */
export function getDailyNoteDate(
	settings: DailyNotesSettings,
	path: string
): string | null {
	const prefix = settings.folder === "" ? "" : `${settings.folder}/`;

	if (!path.startsWith(prefix)) {
		return null;
	}

	const name = path.slice(prefix.length);

	if (!name.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
		return null;
	}

	const date = moment(
		name.slice(0, name.length - MARKDOWN_EXTENSION.length),
		settings.format,
		true
	);

	return date.isValid() ? date.format(ISO_DATE_FORMAT) : null;
}

export function isWithinRange(range: DateRange, date: string): boolean {
	if (range.from !== null && date < range.from) {
		return false;
	}

	return range.to === null || date <= range.to;
}

function normalizeFolder(folder: string): string {
	const value = folder.trim();

	return value === "" || value === "/" ? "" : normalizePath(value);
}
