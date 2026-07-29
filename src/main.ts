import { Editor, MarkdownView, Plugin, TFile } from "obsidian";

import {
	TimesheetSettingTab,
	TimesheetSettings,
	DEFAULT_SETTINGS,
	getSheetTypeCodeBlockName,
	getSheetTypeCommandName,
	normalizeSheetType,
	normalizeSheetTypeCode,
} from "./settings";

import TimesheetRenderChild from "./codeblocks/timesheet-render-child";

const DEFAULT_CODE_BLOCK = "timesheet";

export default class Timesheet extends Plugin {
	settings: TimesheetSettings;

	private registeredCodeBlocks = new Set<string>();
	private sheetTypeCommands = new Map<string, string>();

	async onload() {
		await this.loadSettings();

		this.addSettingsTab();
		this.registerCodeBlock(DEFAULT_CODE_BLOCK, null);

		this.addCommand({
			id: "insert-timesheet",
			name: "Insert timesheet",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection(`\`\`\`${DEFAULT_CODE_BLOCK}\n\n\`\`\``);
			},
		});

		this.refreshSheetTypes();
	}

	async addSettingsTab() {
		this.addSettingTab(new TimesheetSettingTab(this.app, this));
	}

	/**
	 * Registers code blocks and commands for sheet types defined in settings.
	 *
	 * Obsidian doesn't allow unregistering a code block processor, so the ones
	 * belonging to deleted sheet types stay registered until the next reload;
	 * they report the sheet type as unknown.
	 */
	refreshSheetTypes() {
		const commandNames = new Map<string, string>();

		this.settings.sheetTypes.forEach((sheetType) => {
			const code = normalizeSheetTypeCode(sheetType.code);

			// A sheet type without a code block type is incomplete: it must not
			// produce a "timesheet-" code block or a command.
			if (code === "") {
				return;
			}

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

	private registerCodeBlock(codeBlock: string, sheetTypeCode: string | null) {
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

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		this.settings.sheetTypes = Array.isArray(this.settings.sheetTypes)
			? this.settings.sheetTypes.map(normalizeSheetType)
			: [];
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshSheetTypes();
	}

	private async getCurrentNoteText(file: TFile): Promise<string> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView?.file?.path === file.path) {
			return activeView.editor.getValue();
		}

		return this.app.vault.cachedRead(file);
	}
}
