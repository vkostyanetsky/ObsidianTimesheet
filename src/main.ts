import { Editor, MarkdownView, Plugin, TFile } from "obsidian";
import { Extension } from "@codemirror/state";

import {
	TimesheetSettingTab,
	TimesheetSettings,
	getSheetTypeCodeBlockName,
	getSheetTypeCommandName,
	hasLegacySheetTypeSettings,
	normalizeSheetTypeCode,
	parseSettings,
} from "./settings";

import TimesheetRenderChild from "./codeblocks/timesheet-render-child";

import {
	createTaskDecorationExtension,
	decorateTasksInReadingView,
} from "./decorations";

export default class Timesheet extends Plugin {
	settings: TimesheetSettings;

	private registeredCodeBlocks = new Set<string>();
	private sheetTypeCommands = new Map<string, string>();
	private taskDecorationExtensions: Extension[] = [];

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
	 * A sheet type without a code block type is no exception: it defines the
	 * plain "timesheet" code block and the command inserting it exactly the
	 * way the other types define theirs, so a vault without such a type has
	 * neither the block nor the command.
	 *
	 * Obsidian doesn't allow unregistering a code block processor, so the ones
	 * belonging to deleted sheet types stay registered until the next reload;
	 * they report the sheet type as unknown.
	 */
	refreshSheetTypes() {
		const commandNames = new Map<string, string>();

		this.settings.sheetTypes.forEach((sheetType) => {
			const code = normalizeSheetTypeCode(sheetType.code);
			const codeBlock = getSheetTypeCodeBlockName(code);

			if (commandNames.has(codeBlock)) {
				return;
			}

			commandNames.set(codeBlock, getSheetTypeCommandName(sheetType));
			this.registerCodeBlock(codeBlock, code);
		});

		this.sheetTypeCommands.forEach((name, codeBlock) => {
			if (commandNames.get(codeBlock) === name) {
				return;
			}

			this.removeCommand(`insert-${codeBlock}`);
			this.sheetTypeCommands.delete(codeBlock);
		});

		commandNames.forEach((name, codeBlock) => {
			if (this.sheetTypeCommands.has(codeBlock)) {
				return;
			}

			this.sheetTypeCommands.set(codeBlock, name);

			this.addCommand({
				id: `insert-${codeBlock}`,
				name,
				editorCallback: (editor: Editor, view: MarkdownView) => {
					editor.replaceSelection(`\`\`\`${codeBlock}\n\n\`\`\``);
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
					const message = error instanceof Error
						? error.message
						: String(error);

					el.createEl("h3", {
						text: `Failed to show timesheet: ${message}`,
					});
				}
			}
		);
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
