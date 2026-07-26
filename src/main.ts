import { Editor, MarkdownView, Plugin, TFile } from "obsidian";

import {
	TimesheetSettingTab,
	TimesheetSettings,
	DEFAULT_SETTINGS,
} from "./settings";

import TimesheetRenderChild from "./codeblocks/timesheet-render-child";

export default class Timesheet extends Plugin {
	settings: TimesheetSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingsTab();
		this.addInsertTimesheetCommand();
		this.addTimesheetCodeblock();
	}

	async addSettingsTab() {
		this.addSettingTab(new TimesheetSettingTab(this.app, this));
	}

	async addInsertTimesheetCommand() {
		this.addCommand({
			id: "insert-timesheet",
			name: "Insert timesheet",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection(`\`\`\`timesheet\n\n\`\`\``);
			},
		});
	}

	async addTimesheetCodeblock() {
		this.registerMarkdownCodeBlockProcessor(
			"timesheet",
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
						file
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
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async getCurrentNoteText(file: TFile): Promise<string> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView?.file?.path === file.path) {
			return activeView.editor.getValue();
		}

		return this.app.vault.cachedRead(file);
	}
}
