import { App, PluginSettingTab, Setting } from "obsidian";
import Timesheet from "./main";

export interface TimesheetSettings {
    defaultTaskNumberPatterns: string;
    roundUpTime: boolean;
    timeRoundingInterval: number;
    templateHeader: string;
    templateDuration: string;
    templateTask: string;
    templateTaskLog: string;
    templateFooter: string;
}

export const DEFAULT_SETTINGS: TimesheetSettings = {
    defaultTaskNumberPatterns: '',
    roundUpTime: false,
    timeRoundingInterval: 15,
    templateHeader: '> [!summary] Timesheet {tasksDuration}',
    templateDuration: "({duration})",
    templateTask: '> \n> {taskNumber} {taskDuration}',
    templateTaskLog: '> - {taskLogTitle}',
    templateFooter: '',
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
				'You can specify task number patterns in a timesheet code block or set default ones here: it will affect all timesheet code blocks without patterns specified.'
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.defaultTaskNumberPatterns)
					.onChange(async (value) => {
						this.plugin.settings.defaultTaskNumberPatterns = value;
						await this.plugin.saveSettings();
					})
			);

        new Setting(containerEl).setName("Time rounding").setHeading();

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
				"The interval to which time of a task will be rounded. For instance, if interval is 30m, then 2h 5m will be shown as 2h 30m."
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

        new Setting(containerEl).setName("Templates").setHeading();

        new Setting(containerEl)
			.setName("Duration")
			.setDesc(
				"Macros: {duration} — duration presentation (for example: 1h 30m)."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateDuration)
					.onChange(async (value) => {
						this.plugin.settings.templateDuration = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Header")
			.setDesc(
				"Macros: {tasksDuration} — total duration of all tasks in a note."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateHeader)
					.onChange(async (value) => {
						this.plugin.settings.templateHeader = value;
						await this.plugin.saveSettings();
					})
			);

        new Setting(containerEl)
			.setName("Task")
			.setDesc(
				"Macros: {taskNumber} — number of a task, {taskDuration} — total duration of a task."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateTask)
					.onChange(async (value) => {
						this.plugin.settings.templateTask = value;
						await this.plugin.saveSettings();
					})
			);

        new Setting(containerEl)
			.setName("Task log")
			.setDesc(
				"Macros: {taskLogTitle} — prettified task log title."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateTaskLog)
					.onChange(async (value) => {
						this.plugin.settings.templateTaskLog = value;
						await this.plugin.saveSettings();
					})
			);

        new Setting(containerEl)
			.setName("Footer")
			.setDesc(
				"No macros."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.templateFooter)
					.onChange(async (value) => {
						this.plugin.settings.templateFooter = value;
						await this.plugin.saveSettings();
					})
			);

	}
}
