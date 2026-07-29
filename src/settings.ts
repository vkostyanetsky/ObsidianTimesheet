import { App, PluginSettingTab, Setting } from "obsidian";
import Timesheet from "./main";

export const SHEET_TYPE_CODE_BLOCK_PREFIX = "timesheet-";

export interface TemplateSettings {
    templateHeader: string;
    templateDuration: string;
    templateTask: string;
    templateTaskLog: string;
    templateFooter: string;
}

export interface SheetTypeSettings extends TemplateSettings {
    code: string;
    title: string;
    defaultTaskNumberPatterns: string;
}

export interface TimesheetSettings extends TemplateSettings {
    defaultTaskNumberPatterns: string;
    roundUpTime: boolean;
    timeRoundingInterval: number;
    stripMarkdown: boolean;
    sheetTypes: SheetTypeSettings[];
}

export interface TimesheetRenderSettings extends TemplateSettings {
    defaultTaskNumberPatterns: string;
    roundUpTime: boolean;
    timeRoundingInterval: number;
    stripMarkdown: boolean;
}

export const DEFAULT_SETTINGS: TimesheetSettings = {
    defaultTaskNumberPatterns: '',
    roundUpTime: false,
    timeRoundingInterval: 15,
    stripMarkdown: false,
    templateHeader: '> [!summary] Timesheet {tasksDuration}',
    templateDuration: "({duration})",
    templateTask: '> \n> {taskNumber} {taskDuration}',
    templateTaskLog: '> - {taskLogTitle}',
    templateFooter: '',
    sheetTypes: [],
};

export function createSheetType(): SheetTypeSettings {
    return {
        code: '',
        title: '',
        defaultTaskNumberPatterns: DEFAULT_SETTINGS.defaultTaskNumberPatterns,
        templateHeader: DEFAULT_SETTINGS.templateHeader,
        templateDuration: DEFAULT_SETTINGS.templateDuration,
        templateTask: DEFAULT_SETTINGS.templateTask,
        templateTaskLog: DEFAULT_SETTINGS.templateTaskLog,
        templateFooter: DEFAULT_SETTINGS.templateFooter,
    };
}

export function normalizeSheetTypeCode(value: string): string {
    let code = value.trim().replace(/\s+/g, "-");

    while (code.toLowerCase().startsWith(SHEET_TYPE_CODE_BLOCK_PREFIX)) {
        code = code.slice(SHEET_TYPE_CODE_BLOCK_PREFIX.length);
    }

    return code.replace(/[^A-Za-z0-9_-]/g, "");
}

export function getSheetTypeCodeBlockName(code: string): string {
    return `${SHEET_TYPE_CODE_BLOCK_PREFIX}${code}`;
}

export function findSheetType(
    settings: TimesheetSettings,
    code: string
): SheetTypeSettings | undefined {
    return settings.sheetTypes.find(
        (sheetType) => normalizeSheetTypeCode(sheetType.code) === code
    );
}

/**
 * Returns a name for the command inserting a code block of the sheet type.
 *
 * A title, if set, is shown in brackets after the default command name:
 * for example, "Insert timesheet (Hobby)". Otherwise the code block name
 * is used: "Insert timesheet-hobby".
 */
export function getSheetTypeCommandName(sheetType: SheetTypeSettings): string {
    const title = sheetType.title.trim();

    return title === ""
        ? `Insert ${getSheetTypeCodeBlockName(normalizeSheetTypeCode(sheetType.code))}`
        : `Insert timesheet (${title})`;
}

/**
 * Returns settings to render a code block with.
 *
 * When a sheet type code is passed, patterns and templates are taken from
 * the sheet type; time rounding and output settings are always global.
 */
export function getRenderSettings(
    settings: TimesheetSettings,
    sheetTypeCode: string | null
): TimesheetRenderSettings {
    const common = {
        roundUpTime: settings.roundUpTime,
        timeRoundingInterval: settings.timeRoundingInterval,
        stripMarkdown: settings.stripMarkdown,
    };

    if (sheetTypeCode === null) {
        return {
            ...common,
            defaultTaskNumberPatterns: settings.defaultTaskNumberPatterns,
            templateHeader: settings.templateHeader,
            templateDuration: settings.templateDuration,
            templateTask: settings.templateTask,
            templateTaskLog: settings.templateTaskLog,
            templateFooter: settings.templateFooter,
        };
    }

    const sheetType = findSheetType(settings, sheetTypeCode);

    if (sheetType === undefined) {
        throw new Error(
            `Sheet type "${getSheetTypeCodeBlockName(sheetTypeCode)}" is not defined in the plugin settings.`
        );
    }

    return {
        ...common,
        defaultTaskNumberPatterns: sheetType.defaultTaskNumberPatterns,
        templateHeader: sheetType.templateHeader,
        templateDuration: sheetType.templateDuration,
        templateTask: sheetType.templateTask,
        templateTaskLog: sheetType.templateTaskLog,
        templateFooter: sheetType.templateFooter,
    };
}

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
				"You can specify task number patterns in a timesheet code block (one pattern per line), or set default patterns here — they will apply to all timesheet code blocks that don't have patterns specified."
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
				'Enables time rounding for tasks, so that, for example, 3h 42m is displayed as 4h.'
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
				"The interval to which a task's time will be rounded. For example, if the interval is 30m, then 2h 5m will be displayed as 2h 30m."
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

        new Setting(containerEl).setName("Output").setHeading();

        new Setting(containerEl)
            .setName("Remove Markdown formatting")
            .setDesc(
                "Removes Markdown formatting from task numbers and task log titles while preserving the Markdown used by the output templates."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.stripMarkdown)
                    .onChange(async (value) => {
                        this.plugin.settings.stripMarkdown = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl).setName("Templates").setHeading();

        this.displayTemplateSettings(containerEl, this.plugin.settings);

        this.displaySheetTypes(containerEl);
	}

    private displaySheetTypes(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Sheet types")
            .setDesc(
                "Sheet types let you use more than one kind of timesheet code block. Each type has its own code block name, task number patterns, and templates."
            )
            .setHeading()
            .addButton((button) =>
                button
                    .setButtonText("Add sheet type")
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.sheetTypes.push(createSheetType());
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        if (this.plugin.settings.sheetTypes.length === 0) {
            containerEl.createEl("p", {
                text: "No sheet types are defined yet.",
                cls: "setting-item-description",
            });

            return;
        }

        this.plugin.settings.sheetTypes.forEach((sheetType, sheetTypeIndex) => {
            this.displaySheetType(containerEl, sheetType, sheetTypeIndex);
        });
    }

    private displaySheetType(
        containerEl: HTMLElement,
        sheetType: SheetTypeSettings,
        sheetTypeIndex: number
    ): void {
        const sheetTypeEl = containerEl.createEl("div", {
            cls: "timesheet-sheet-type",
        });

        new Setting(sheetTypeEl)
            .setName(this.getSheetTypeHeading(sheetType))
            .setHeading()
            .addExtraButton((button) =>
                button
                    .setIcon("trash")
                    .setTooltip("Delete sheet type")
                    .onClick(async () => {
                        this.plugin.settings.sheetTypes.splice(sheetTypeIndex, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        new Setting(sheetTypeEl)
            .setName("Code block type")
            .setDesc(
                `An identifier without spaces. It is added to the "${SHEET_TYPE_CODE_BLOCK_PREFIX}" prefix: for example, "hobby" makes the plugin render "${getSheetTypeCodeBlockName("hobby")}" code blocks.`
            )
            .addText((text) =>
                text
                    .setPlaceholder("hobby")
                    .setValue(sheetType.code)
                    .onChange(async (value) => {
                        const code = normalizeSheetTypeCode(value);

                        if (code !== value) {
                            text.setValue(code);
                        }

                        sheetType.code = code;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl)
            .setName("Title")
            .setDesc(
                'A human-friendly name of the sheet type. It is shown in brackets after the name of the command inserting a code block of this type: for example, "Insert timesheet (Hobby)". If the title is empty, the code block name is used instead.'
            )
            .addText((text) =>
                text
                    .setPlaceholder("Hobby")
                    .setValue(sheetType.title)
                    .onChange(async (value) => {
                        sheetType.title = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl)
            .setName("Default task number pattern")
            .setDesc(
                "Works like the global setting, but applies to this sheet type only. Patterns can be specified either here (one pattern per line) or in a code block of this type."
            )
            .setClass("text-snippets-class")
            .addTextArea((text) =>
                text
                    .setValue(sheetType.defaultTaskNumberPatterns)
                    .onChange(async (value) => {
                        sheetType.defaultTaskNumberPatterns = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl).setName("Templates").setHeading();

        this.displayTemplateSettings(sheetTypeEl, sheetType);
    }

    private getSheetTypeHeading(sheetType: SheetTypeSettings): string {
        const code = normalizeSheetTypeCode(sheetType.code);
        const title = sheetType.title.trim();

        if (code === "") {
            return title === "" ? "New sheet type" : title;
        }

        const codeBlock = getSheetTypeCodeBlockName(code);

        return title === "" ? codeBlock : `${codeBlock} (${title})`;
    }

    private displayTemplateSettings(
        containerEl: HTMLElement,
        target: TemplateSettings
    ): void {
        new Setting(containerEl)
			.setName("Duration")
			.setDesc(
				"Macros: {duration} — duration presentation (for example: 1h 30m)."
			)
            .setClass("text-snippets-class")
			.addTextArea((text) =>
				text
					.setValue(target.templateDuration)
					.onChange(async (value) => {
						target.templateDuration = value;
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
					.setValue(target.templateHeader)
					.onChange(async (value) => {
						target.templateHeader = value;
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
					.setValue(target.templateTask)
					.onChange(async (value) => {
						target.templateTask = value;
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
					.setValue(target.templateTaskLog)
					.onChange(async (value) => {
						target.templateTaskLog = value;
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
					.setValue(target.templateFooter)
					.onChange(async (value) => {
						target.templateFooter = value;
						await this.plugin.saveSettings();
					})
			);
    }
}
