import { App, PluginSettingTab, Setting } from "obsidian";
import Timesheet from "./main";

export interface TimesheetSettings {
    defaultTaskNumberPatterns: string;
    roundUpTime: boolean;
    timeRoundingInterval: number;
}

export const DEFAULT_SETTINGS: TimesheetSettings = {
    defaultTaskNumberPatterns: "",
    roundUpTime: false,
    timeRoundingInterval: 15,
};

export class TimesheetSettingTab extends PluginSettingTab {
	plugin: Timesheet;

	constructor(app: App, plugin: Timesheet) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
    
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default task number patterns")
			.setDesc(
				'You can specify task number patterns in a `timesheet` code block or simply set default ones here: it will affect all `timesheet` code blocks without patterns specified.'
			)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.defaultTaskNumberPatterns)
					.onChange(async (value) => {
						this.plugin.settings.defaultTaskNumberPatterns = value;
						await this.plugin.saveSettings();
					})
			);

        containerEl.createEl("h2", { text: "Time rounding" });

        new Setting(containerEl)
			.setName("Round up time")
			.setDesc(
				'Enables time rounding for tasks. For instance, 3h 42m can be shown as 4h.'
			)
			.addToggle((text) =>
				text
					.setValue(this.plugin.settings.roundUpTime)
					.onChange(async (value) => {
						this.plugin.settings.roundUpTime = value;
						await this.plugin.saveSettings();
					})
			);

        new Setting(containerEl)
			.setName("Time rounding interval")
			.setDesc(
				"The interval to which time of a task will be rounded. For instance, if interval is 15m, then 2h 5m will be shown as 2h 30m."
			)
			.addDropdown((text) =>
				text
                    .addOptions({
                        '15': '15m',
                        '30': '30m',
                        '60': '1h',
                    })
					.setValue(this.plugin.settings.timeRoundingInterval.toString())
					.onChange(async (value) => {
						this.plugin.settings.timeRoundingInterval = Number(value);
						await this.plugin.saveSettings();
					})
			);

	}
}
