import { Editor, MarkdownView, Plugin, TFile } from "obsidian";
import { Extension } from "@codemirror/state";

import {
	TimesheetSettingTab,
	TimesheetSettings,
	getSheetTypeCodeBlockName,
	getSheetTypeCommandName,
	getSheetTypeQueryCodeBlockName,
	getSheetTypeQueryCommandName,
	hasLegacySheetTypeSettings,
	normalizeSheetTypeCode,
	parseSettings,
} from "./settings";

import { QUERY_SETTING_PERIOD } from "./query";

import { DailyNotesSettings, readDailyNotesSettings } from "./daily-notes";

import TimesheetRenderChild from "./codeblocks/timesheet-render-child";
import TimesheetQueryRenderChild from "./codeblocks/timesheet-query-render-child";

import {
	createTaskDecorationExtension,
	decorateTasksInReadingView,
} from "./decorations";

/** A command inserting a code block of a sheet type. */
interface CodeBlockCommand {
	name: string;
	/** The body a freshly inserted code block is filled with. */
	body: string;
}

/**
 * How long the settings of the Daily notes core plugin are reused for.
 *
 * Obsidian doesn't tell a community plugin that a core plugin was set up
 * differently, so the only way to notice is to read the file again. A few
 * seconds are short enough for a change to be picked up while the settings
 * are still being played with, and long enough to keep a burst of updates
 * from turning into a burst of reads.
 */
const DAILY_NOTES_SETTINGS_LIFETIME = 5000;

export default class Timesheet extends Plugin {
	settings: TimesheetSettings;

	private registeredCodeBlocks = new Set<string>();
	private sheetTypeCommands = new Map<string, CodeBlockCommand>();
	private taskDecorationExtensions: Extension[] = [];
	private dailyNotesSettings: DailyNotesSettings | null = null;
	private dailyNotesSettingsReadAt = 0;
	private dailyNotesSettingsRequest: Promise<DailyNotesSettings> | null = null;

	async onload() {
		await this.loadSettings();

		this.addSettingsTab();
		this.registerTaskDecorations();
		this.refreshSheetTypes();
	}

	async addSettingsTab() {
		this.addSettingTab(new TimesheetSettingTab(this.app, this));
	}

	/**
	 * Registers code blocks and commands for sheet types defined in settings.
	 *
	 * Every sheet type defines two code blocks: the plain one, reporting on
	 * the note it belongs to, and the "-query" one, reporting on the daily
	 * notes of a date range. A sheet type without a code block type is no
	 * exception: it defines the "timesheet" and "timesheet-query" blocks and
	 * the commands inserting them exactly the way the other types define
	 * theirs, so a vault without such a type has neither the blocks nor the
	 * commands.
	 *
	 * Obsidian doesn't allow unregistering a code block processor, so the ones
	 * belonging to deleted sheet types stay registered until the next reload;
	 * they report the sheet type as unknown.
	 */
	refreshSheetTypes() {
		const commands = new Map<string, CodeBlockCommand>();

		this.settings.sheetTypes.forEach((sheetType) => {
			const code = normalizeSheetTypeCode(sheetType.code);
			const codeBlock = getSheetTypeCodeBlockName(code);
			const queryCodeBlock = getSheetTypeQueryCodeBlockName(code);

			if (commands.has(codeBlock) || commands.has(queryCodeBlock)) {
				return;
			}

			commands.set(codeBlock, {
				name: getSheetTypeCommandName(sheetType),
				body: "",
			});

			commands.set(queryCodeBlock, {
				name: getSheetTypeQueryCommandName(sheetType),
				body: `${QUERY_SETTING_PERIOD}: `,
			});

			this.registerCodeBlock(codeBlock, code);
			this.registerQueryCodeBlock(queryCodeBlock, code);
		});

		this.sheetTypeCommands.forEach((command, codeBlock) => {
			if (commands.get(codeBlock)?.name === command.name) {
				return;
			}

			this.removeCommand(`insert-${codeBlock}`);
			this.sheetTypeCommands.delete(codeBlock);
		});

		commands.forEach((command, codeBlock) => {
			if (this.sheetTypeCommands.has(codeBlock)) {
				return;
			}

			this.sheetTypeCommands.set(codeBlock, command);

			this.addCommand({
				id: `insert-${codeBlock}`,
				name: command.name,
				editorCallback: (editor: Editor, view: MarkdownView) => {
					editor.replaceSelection(
						`\`\`\`${codeBlock}\n${command.body}\n\`\`\``
					);

					// The cursor ends up after the closing fence, while the
					// only line worth typing into is the body of the block.
					const cursor = editor.getCursor();

					editor.setCursor({
						line: cursor.line - 1,
						ch: command.body.length,
					});
				},
			});
		});
	}

	private registerCodeBlock(codeBlock: string, sheetTypeCode: string) {
		if (this.registeredCodeBlocks.has(codeBlock)) {
			return;
		}

		this.registeredCodeBlocks.add(codeBlock);

		this.registerMarkdownCodeBlockProcessor(
			codeBlock,
			async (src, el, ctx) => {
				try {
					const file = this.app.vault.getFileByPath(ctx.sourcePath);

					if (file === null) {
						return;
					}

					const root = el.createEl("div");
					const body = root.createEl("div");
					const child = new TimesheetRenderChild(
						this,
						src,
						body,
						file,
						sheetTypeCode
					);

					ctx.addChild(child);

					await child.update(await this.getCurrentNoteText(file));
				} catch (error: unknown) {
					this.showCodeBlockError(el, error);
				}
			}
		);
	}

	/**
	 * Registers a code block reporting on the daily notes of a date range.
	 *
	 * Such a block knows nothing about the note it is written in: the text of
	 * the note is not passed to the render child, which collects the notes to
	 * report on by itself.
	 */
	private registerQueryCodeBlock(codeBlock: string, sheetTypeCode: string) {
		if (this.registeredCodeBlocks.has(codeBlock)) {
			return;
		}

		this.registeredCodeBlocks.add(codeBlock);

		this.registerMarkdownCodeBlockProcessor(
			codeBlock,
			async (src, el, ctx) => {
				try {
					const file = this.app.vault.getFileByPath(ctx.sourcePath);

					if (file === null) {
						return;
					}

					const root = el.createEl("div");
					const body = root.createEl("div");
					const child = new TimesheetQueryRenderChild(
						this,
						src,
						body,
						file,
						sheetTypeCode
					);

					ctx.addChild(child);

					await child.update();
				} catch (error: unknown) {
					this.showCodeBlockError(el, error);
				}
			}
		);
	}

	/**
	 * Returns the settings of the Daily notes core plugin, reading them anew
	 * once in a while.
	 *
	 * Every query code block asks for the same settings, and a single change
	 * in the vault makes all of them rebuild their reports at once, so the
	 * settings are read for the whole plugin rather than for a code block —
	 * and only one read is made at a time, no matter how many blocks are
	 * waiting for it.
	 */
	public getDailyNotesSettings(): Promise<DailyNotesSettings> {
		const settings = this.getKnownDailyNotesSettings();

		if (settings !== null) {
			return Promise.resolve(settings);
		}

		if (this.dailyNotesSettingsRequest === null) {
			this.dailyNotesSettingsRequest = this.refreshDailyNotesSettings();
		}

		return this.dailyNotesSettingsRequest;
	}

	private async refreshDailyNotesSettings(): Promise<DailyNotesSettings> {
		try {
			const settings = await readDailyNotesSettings(this.app);

			this.dailyNotesSettings = settings;
			this.dailyNotesSettingsReadAt = Date.now();

			return settings;
		} finally {
			this.dailyNotesSettingsRequest = null;
		}
	}

	/**
	 * Returns the settings of the Daily notes core plugin without reading
	 * them, or null when the ones read last time are too old to be trusted.
	 *
	 * Settings that may have been changed since they were read are worth no
	 * more than no settings at all: a caller taking the old folder for the
	 * current one would ignore everything happening in the new one — and
	 * would never ask for the settings again, since nothing seems to be
	 * happening.
	 */
	public getKnownDailyNotesSettings(): DailyNotesSettings | null {
		return Date.now() - this.dailyNotesSettingsReadAt <
			DAILY_NOTES_SETTINGS_LIFETIME
			? this.dailyNotesSettings
			: null;
	}

	private showCodeBlockError(el: HTMLElement, error: unknown) {
		const message = error instanceof Error ? error.message : String(error);

		el.createEl("h3", {
			text: `Failed to show timesheet: ${message}`,
		});
	}

	/**
	 * Turns on decorating of task records with the texts of sheet types.
	 *
	 * The editor extension is registered as an array, so that it can be
	 * replaced when the settings change: an extension already loaded by the
	 * editor is never asked for decorations again.
	 */
	private registerTaskDecorations() {
		this.registerEditorExtension(this.taskDecorationExtensions);
		this.refreshTaskDecorations();

		this.registerMarkdownPostProcessor((element) => {
			decorateTasksInReadingView(this.settings, element);
		});
	}

	private refreshTaskDecorations() {
		this.taskDecorationExtensions.length = 0;
		this.taskDecorationExtensions.push(
			createTaskDecorationExtension(() => this.settings)
		);

		this.app.workspace.updateOptions();
	}

	onunload() {}

	/**
	 * Reads the settings, converting the ones saved by a version of the plugin
	 * that described the "timesheet" code block globally.
	 *
	 * Converted settings are saved right away, so that the properties which
	 * became a sheet type are not left behind in the data file.
	 */
	async loadSettings() {
		const data: unknown = await this.loadData();

		this.settings = parseSettings(data);

		if (hasLegacySheetTypeSettings(data)) {
			await this.saveData(this.settings);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshSheetTypes();
		this.refreshTaskDecorations();
	}

	private async getCurrentNoteText(file: TFile): Promise<string> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView?.file?.path === file.path) {
			return activeView.editor.getValue();
		}

		return this.app.vault.cachedRead(file);
	}
}
