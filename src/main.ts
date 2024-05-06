import { Plugin, Editor, MarkdownView } from "obsidian";

import {
	TimesheetSettingTab,
	TimesheetSettings,
	DEFAULT_SETTINGS,
} from "./settings";

import TimesheetCodeBlock from "./codeblocks/timesheet";

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
                    console.log(ctx);
					const root = el.createEl("div");
					const body = root.createEl("div");

					await TimesheetCodeBlock.render(this, src, body, ctx);
				} catch (error) {
					el.createEl("h3", {
						text: `Failed to show timesheet: ${error.message}`,
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
}
