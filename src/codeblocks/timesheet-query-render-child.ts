import {
	MarkdownRenderChild,
	MarkdownRenderer,
	TAbstractFile,
	TFile,
} from "obsidian";

import Timesheet from "../main";
import TimesheetCodeBlock from "./timesheet";

import { getRenderSettings, getTaskNumberPatterns } from "../settings";

import {
	DailyNotesSettings,
	findDailyNotes,
	getDailyNoteDate,
	isWithinRange,
} from "../daily-notes";

import {
	DateRange,
	QUERY_SETTING_FROM,
	QUERY_SETTING_PERIOD,
	QUERY_SETTING_TO,
	parseTimesheetQuery,
} from "../query";

const UPDATE_DELAY = 250;

const ERRORS_CALLOUT_TITLE = "Timesheet query";

const RANGE_HINT = [
	"> [!tip] Date range is not set",
	`> A report is built for the daily notes of a date range, so name a period — for example, \`${QUERY_SETTING_PERIOD}: 2026-07\` — or set the \`${QUERY_SETTING_FROM}\` and \`${QUERY_SETTING_TO}\` settings of the code block.`,
].join("\n");

/**
 * Renders a query code block: a report on the daily notes of a date range.
 *
 * The report is rebuilt whenever a daily note of the range changes, since the
 * notes it is built from are not the note it belongs to: unlike a plain
 * timesheet, such a report goes out of date because of an edit made
 * somewhere else.
 */
export default class TimesheetQueryRenderChild extends MarkdownRenderChild {
	private updateTimer: number | null = null;
	private rendering = false;
	private updateRequested = false;
	private lastOutput: string | null = null;
	private range: DateRange | null = null;
	private rangeIsRelative = false;
	private unsavedNoteTexts = new Map<string, string>();

	constructor(
		private readonly plugin: Timesheet,
		private readonly source: string,
		private readonly body: HTMLElement,
		private readonly file: TFile,
		private readonly sheetTypeCode: string
	) {
		super(body);
	}

	onload(): void {
		const vault = this.plugin.app.vault;

		this.registerEvent(
			vault.on("create", (file) => this.onVaultChange(file))
		);

		this.registerEvent(
			vault.on("delete", (file) => {
				this.unsavedNoteTexts.delete(file.path);
				this.onVaultChange(file);
			})
		);

		this.registerEvent(
			vault.on("modify", (file) => {
				// The note is saved, so its text is taken from the vault
				// again: the one kept for the editor is no longer needed.
				this.unsavedNoteTexts.delete(file.path);
				this.onVaultChange(file);
			})
		);

		this.registerEvent(
			vault.on("rename", (file, oldPath) => {
				this.unsavedNoteTexts.delete(oldPath);
				this.onVaultChange(file, oldPath);
			})
		);

		this.registerEvent(
			this.plugin.app.workspace.on("quick-preview", (file, noteText) => {
				if (!this.mayAffectReport(file.path)) {
					return;
				}

				this.unsavedNoteTexts.set(file.path, noteText);
				this.scheduleUpdate();
			})
		);
	}

	onunload(): void {
		if (this.updateTimer !== null) {
			window.clearTimeout(this.updateTimer);
		}

		this.unsavedNoteTexts.clear();
	}

	public async update(): Promise<void> {
		this.updateRequested = true;

		if (this.rendering) {
			return;
		}

		this.rendering = true;

		try {
			while (this.updateRequested) {
				this.updateRequested = false;

				const output = await this.buildOutput();

				if (output === this.lastOutput) {
					continue;
				}

				this.body.empty();

				await MarkdownRenderer.render(
					this.plugin.app,
					output,
					this.body,
					this.file.path,
					this
				);

				this.lastOutput = output;
			}
		} finally {
			this.rendering = false;
		}
	}

	/**
	 * Builds the text of the report, or a callout explaining why there is no
	 * report to show.
	 *
	 * A sheet type that is gone is reported the same way a mistake in the
	 * code block is: a block left over from a deleted sheet type keeps being
	 * rendered until Obsidian is restarted, and an exception thrown on every
	 * change in the vault would be a poor way to say so.
	 */
	private async buildOutput(): Promise<string> {
		// The settings are asked for even when the report cannot be built:
		// they are what tells the changes worth an update from the rest.
		const dailyNotesSettings = await this.plugin.getDailyNotesSettings();

		const query = parseTimesheetQuery(this.source);

		this.range = query.range;
		this.rangeIsRelative = query.relative;

		if (query.errors.length > 0) {
			return this.buildErrorsCallout(query.errors);
		}

		let settings;

		try {
			settings = getRenderSettings(
				this.plugin.settings,
				this.sheetTypeCode
			);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : String(error);

			return this.buildErrorsCallout([message]);
		}

		// Patterns of a query code block always come from its sheet type:
		// the block itself is busy describing a date range.
		const taskNumberPatterns = getTaskNumberPatterns(
			settings.defaultTaskNumberPatterns
		);

		if (query.range === null) {
			const report = TimesheetCodeBlock.buildReport(
				settings,
				taskNumberPatterns,
				[]
			);

			return report === "" ? RANGE_HINT : `${RANGE_HINT}\n\n${report}`;
		}

		const notes = findDailyNotes(
			this.plugin.app,
			dailyNotesSettings,
			query.range
		);

		const noteTexts: string[] = [];

		// The notes are read one by one on purpose: a report on a year is a
		// report on hundreds of files, and there is no hurry — the update is
		// a delayed one anyway.
		for (const note of notes) {
			noteTexts.push(await this.readNote(note.file));
		}

		return TimesheetCodeBlock.buildReport(
			settings,
			taskNumberPatterns,
			noteTexts
		);
	}

	private async readNote(file: TFile): Promise<string> {
		const unsaved = this.unsavedNoteTexts.get(file.path);

		return unsaved ?? (await this.plugin.app.vault.cachedRead(file));
	}

	private buildErrorsCallout(errors: string[]): string {
		const lines = [`> [!error] ${ERRORS_CALLOUT_TITLE}`];

		errors.forEach((error) => {
			lines.push(`> - ${error}`);
		});

		return lines.join("\n");
	}

	private onVaultChange(file: TAbstractFile, oldPath?: string): void {
		if (
			!this.mayAffectReport(file.path) &&
			(oldPath === undefined || !this.mayAffectReport(oldPath))
		) {
			return;
		}

		this.scheduleUpdate();
	}

	/**
	 * Tells whether a change of a file is worth rebuilding the report for.
	 *
	 * Only a daily note belonging to a day of the range is — but the range
	 * is the one of the report shown right now, so it is trusted only when
	 * it was written down: a range counted from today, like "last-month",
	 * covers other days tomorrow, and the report has to notice a note the
	 * range it was built from didn't reach yet.
	 *
	 * As long as the settings of the Daily notes core plugin are unknown,
	 * every file is treated as a daily note: an extra update is cheaper than
	 * a report left out of date.
	 */
	private mayAffectReport(path: string): boolean {
		const settings: DailyNotesSettings | null =
			this.plugin.getKnownDailyNotesSettings();

		if (settings === null) {
			return true;
		}

		const date = getDailyNoteDate(settings, path);

		if (date === null) {
			return false;
		}

		return (
			this.range === null ||
			this.rangeIsRelative ||
			isWithinRange(this.range, date)
		);
	}

	private scheduleUpdate(): void {
		if (this.updateTimer !== null) {
			window.clearTimeout(this.updateTimer);
		}

		this.updateTimer = window.setTimeout(() => {
			this.updateTimer = null;

			void this.update().catch((error: unknown) => {
				this.showError(error);
			});
		}, UPDATE_DELAY);
	}

	private showError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);

		// The report is gone from the view, so the next one has to be
		// rendered even when it says exactly what the previous one said.
		this.lastOutput = null;

		this.body.empty();
		this.body.createEl("h3", {
			text: `Failed to show timesheet: ${message}`,
		});
	}
}
