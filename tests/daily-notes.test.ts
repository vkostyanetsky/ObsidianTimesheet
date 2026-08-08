import { describe, expect, it } from "vitest";

import type { App } from "obsidian";

import {
	DailyNotesSettings,
	findDailyNotes,
	getDailyNoteDate,
	isWithinRange,
	readDailyNotesSettings,
} from "../src/daily-notes";

const DEFAULT_SETTINGS: DailyNotesSettings = {
	folder: "",
	format: "YYYY-MM-DD",
};

/**
 * Builds a vault out of the paths of its notes and the files of its
 * configuration folder.
 */
function createApp(
	markdownFiles: string[] = [],
	configFiles: Record<string, string> = {}
): App {
	return {
		vault: {
			configDir: ".obsidian",
			getMarkdownFiles: () =>
				markdownFiles.map((path) => ({
					path,
					name: path.slice(path.lastIndexOf("/") + 1),
				})),
			adapter: {
				exists: (path: string) =>
					Promise.resolve(
						Object.prototype.hasOwnProperty.call(configFiles, path)
					),
				read: (path: string) => Promise.resolve(configFiles[path]),
			},
		},
	} as unknown as App;
}

describe("readDailyNotesSettings", () => {
	it("falls back to the defaults of Obsidian when the core plugin was never set up", async () => {
		expect(await readDailyNotesSettings(createApp())).toEqual(
			DEFAULT_SETTINGS
		);
	});

	it("reads the settings of the core plugin", async () => {
		const app = createApp([], {
			".obsidian/daily-notes.json": JSON.stringify({
				folder: "Journal",
				format: "DD.MM.YYYY",
			}),
		});

		expect(await readDailyNotesSettings(app)).toEqual({
			folder: "Journal",
			format: "DD.MM.YYYY",
		});
	});

	it("reads the vault root as an empty folder", async () => {
		const app = createApp([], {
			".obsidian/daily-notes.json": JSON.stringify({ folder: "/" }),
		});

		expect((await readDailyNotesSettings(app)).folder).toBe("");
	});

	it("cleans up the folder of the core plugin", async () => {
		const app = createApp([], {
			".obsidian/daily-notes.json": JSON.stringify({
				folder: "/Journal/Days/",
			}),
		});

		expect((await readDailyNotesSettings(app)).folder).toBe("Journal/Days");
	});

	it("falls back to the default format when the setting is blank", async () => {
		const app = createApp([], {
			".obsidian/daily-notes.json": JSON.stringify({ format: "   " }),
		});

		expect((await readDailyNotesSettings(app)).format).toBe("YYYY-MM-DD");
	});

	it("survives a broken settings file", async () => {
		const app = createApp([], {
			".obsidian/daily-notes.json": "{ not a json",
		});

		expect(await readDailyNotesSettings(app)).toEqual(DEFAULT_SETTINGS);
	});

	it("survives a settings file that is not a list of settings", async () => {
		const app = createApp([], { ".obsidian/daily-notes.json": '"nope"' });

		expect(await readDailyNotesSettings(app)).toEqual(DEFAULT_SETTINGS);
	});
});

describe("getDailyNoteDate", () => {
	it("reads the day a note of the vault root belongs to", () => {
		expect(getDailyNoteDate(DEFAULT_SETTINGS, "2026-07-01.md")).toBe(
			"2026-07-01"
		);
	});

	it("reads the day a note of the daily notes folder belongs to", () => {
		expect(
			getDailyNoteDate(
				{ folder: "Journal", format: "YYYY-MM-DD" },
				"Journal/2026-07-01.md"
			)
		).toBe("2026-07-01");
	});

	it("reads a day written in the format of the core plugin", () => {
		expect(
			getDailyNoteDate(
				{ folder: "", format: "DD.MM.YYYY" },
				"01.07.2026.md"
			)
		).toBe("2026-07-01");
	});

	it("reads a note kept in subfolders by year and by month", () => {
		expect(
			getDailyNoteDate(
				{ folder: "Journal", format: "YYYY/MM/YYYY-MM-DD" },
				"Journal/2026/07/2026-07-01.md"
			)
		).toBe("2026-07-01");
	});

	it("does not read a note of another folder", () => {
		expect(
			getDailyNoteDate(
				{ folder: "Journal", format: "YYYY-MM-DD" },
				"Notes/2026-07-01.md"
			)
		).toBeNull();
	});

	it("does not read a note of a subfolder the format knows nothing of", () => {
		expect(
			getDailyNoteDate(
				{ folder: "Journal", format: "YYYY-MM-DD" },
				"Journal/2026/2026-07-01.md"
			)
		).toBeNull();
	});

	it("does not read a note that is not named after a day", () => {
		expect(getDailyNoteDate(DEFAULT_SETTINGS, "Groceries.md")).toBeNull();
	});

	it("does not read a day that does not exist", () => {
		expect(getDailyNoteDate(DEFAULT_SETTINGS, "2026-02-31.md")).toBeNull();
	});

	it("does not read a file that is not a note", () => {
		expect(getDailyNoteDate(DEFAULT_SETTINGS, "2026-07-01.txt")).toBeNull();
	});
});

describe("isWithinRange", () => {
	it("counts the bounds of a range as a part of it", () => {
		const range = { from: "2026-07-01", to: "2026-07-31" };

		expect(isWithinRange(range, "2026-07-01")).toBe(true);
		expect(isWithinRange(range, "2026-07-31")).toBe(true);
		expect(isWithinRange(range, "2026-07-15")).toBe(true);
	});

	it("leaves the days around a range out of it", () => {
		const range = { from: "2026-07-01", to: "2026-07-31" };

		expect(isWithinRange(range, "2026-06-30")).toBe(false);
		expect(isWithinRange(range, "2026-08-01")).toBe(false);
	});

	it("counts every day of a range open on one side", () => {
		expect(isWithinRange({ from: "2026-07-01", to: null }, "2030-01-01")).toBe(
			true
		);
		expect(isWithinRange({ from: null, to: "2026-07-01" }, "1999-01-01")).toBe(
			true
		);
	});

	it("counts every day of a range open on both sides", () => {
		expect(isWithinRange({ from: null, to: null }, "2026-07-01")).toBe(true);
	});
});

describe("findDailyNotes", () => {
	it("returns the notes of a range, from the earliest day to the latest", () => {
		const app = createApp([
			"2026-07-15.md",
			"2026-07-01.md",
			"2026-07-31.md",
		]);

		const notes = findDailyNotes(app, DEFAULT_SETTINGS, {
			from: "2026-07-01",
			to: "2026-07-31",
		});

		expect(notes.map((note) => note.date)).toEqual([
			"2026-07-01",
			"2026-07-15",
			"2026-07-31",
		]);
	});

	it("leaves out the notes of the days around a range", () => {
		const app = createApp([
			"2026-06-30.md",
			"2026-07-01.md",
			"2026-08-01.md",
		]);

		const notes = findDailyNotes(app, DEFAULT_SETTINGS, {
			from: "2026-07-01",
			to: "2026-07-31",
		});

		expect(notes.map((note) => note.file.path)).toEqual(["2026-07-01.md"]);
	});

	it("leaves out the notes that are not daily ones", () => {
		const app = createApp(["Groceries.md", "2026-07-01.md"]);

		const notes = findDailyNotes(app, DEFAULT_SETTINGS, {
			from: null,
			to: null,
		});

		expect(notes.map((note) => note.file.path)).toEqual(["2026-07-01.md"]);
	});

	it("orders the notes of one and the same day by their paths", () => {
		// A format accepting both a padded and an unpadded day gives two notes
		// of a vault the very same date.
		const app = createApp(["2026-7-1.md", "2026-07-01.md"]);

		const notes = findDailyNotes(
			app,
			{ folder: "", format: "YYYY-M-D" },
			{ from: null, to: null }
		);

		expect(notes.map((note) => note.file.path)).toEqual([
			"2026-07-01.md",
			"2026-7-1.md",
		]);
	});

	it("returns nothing when the vault has no daily notes", () => {
		expect(
			findDailyNotes(createApp(), DEFAULT_SETTINGS, { from: null, to: null })
		).toEqual([]);
	});
});
