import { App, PluginSettingTab, Setting } from "obsidian";
import Timesheet from "./main";

export const SHEET_TYPE_CODE_BLOCK_PREFIX = "timesheet-";

/** The code block rendered by a sheet type with an empty code. */
export const DEFAULT_CODE_BLOCK = "timesheet";

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
    textBeforeTask: string;
    textAfterTask: string;
}

export interface TimesheetSettings {
    roundUpTime: boolean;
    timeRoundingInterval: number;
    stripMarkdown: boolean;
    warnAboutOverlaps: boolean;
    sheetTypes: SheetTypeSettings[];
}

export interface TimesheetRenderSettings extends TemplateSettings {
    defaultTaskNumberPatterns: string;
    roundUpTime: boolean;
    timeRoundingInterval: number;
    stripMarkdown: boolean;
    warnAboutOverlaps: boolean;
}

/**
 * Templates a new sheet type starts with.
 *
 * Up to version 1.6.0 the same values were the defaults of the global
 * templates, so a sheet type built from settings of an earlier version keeps
 * rendering reports the way it used to.
 */
export const DEFAULT_TEMPLATES: TemplateSettings = {
    templateHeader: '> [!summary] Timesheet {tasksDuration}',
    templateDuration: "({duration})",
    templateTask: '> \n> {taskNumber} {taskDuration}',
    templateTaskLog: '> - {taskLogTitle}',
    templateFooter: '',
};

export const DEFAULT_SETTINGS: TimesheetSettings = {
    roundUpTime: false,
    timeRoundingInterval: 15,
    stripMarkdown: false,
    warnAboutOverlaps: true,
    sheetTypes: [],
};

export function createSheetType(): SheetTypeSettings {
    return {
        code: '',
        title: '',
        defaultTaskNumberPatterns: '',
        textBeforeTask: '',
        textAfterTask: '',
        ...DEFAULT_TEMPLATES,
    };
}

/**
 * Fills in properties missing from a sheet type saved by an earlier version
 * of the plugin, so that settings written before a property was introduced
 * don't break the plugin.
 */
export function normalizeSheetType(
    sheetType: Partial<SheetTypeSettings> | null | undefined
): SheetTypeSettings {
    return Object.assign(createSheetType(), sheetType ?? {});
}

export function normalizeSheetTypeCode(value: string | undefined): string {
    let code = (value ?? "").trim().replace(/\s+/g, "-");

    while (code.toLowerCase().startsWith(SHEET_TYPE_CODE_BLOCK_PREFIX)) {
        code = code.slice(SHEET_TYPE_CODE_BLOCK_PREFIX.length);
    }

    return code.replace(/[^A-Za-z0-9_-]/g, "");
}

/**
 * Returns the name of the code block a sheet type renders.
 *
 * A sheet type without a code describes the plain `timesheet` code block,
 * while any other code is added to the `timesheet-` prefix.
 */
export function getSheetTypeCodeBlockName(code: string): string {
    return code === ""
        ? DEFAULT_CODE_BLOCK
        : `${SHEET_TYPE_CODE_BLOCK_PREFIX}${code}`;
}

/**
 * Names of the settings that described the plain `timesheet` code block
 * before version 1.6.0, when it got a sheet type of its own.
 */
const LEGACY_SHEET_TYPE_KEYS = [
    "defaultTaskNumberPatterns",
    "templateHeader",
    "templateDuration",
    "templateTask",
    "templateTaskLog",
    "templateFooter",
] as const;

type LegacyData = Partial<Record<(typeof LEGACY_SHEET_TYPE_KEYS)[number], unknown>>;

/**
 * Tells whether the saved settings were written by a version of the plugin
 * describing the plain `timesheet` code block with global settings.
 */
export function hasLegacySheetTypeSettings(data: unknown): boolean {
    const raw = (data ?? {}) as LegacyData;

    return LEGACY_SHEET_TYPE_KEYS.some((key) => typeof raw[key] === "string");
}

/**
 * Builds settings from the data saved by the plugin.
 *
 * Global task number patterns and templates are no longer supported: when
 * they are found, they are turned into a sheet type with an empty code, so
 * that the `timesheet` code blocks of a vault keep being rendered the way
 * they were before the update. Nothing is created for a fresh install: sheet
 * types are up to the user.
 */
export function parseSettings(data: unknown): TimesheetSettings {
    const raw = (data ?? {}) as Partial<TimesheetSettings> & LegacyData;

    const settings: TimesheetSettings = {
        roundUpTime: typeof raw.roundUpTime === "boolean"
            ? raw.roundUpTime
            : DEFAULT_SETTINGS.roundUpTime,
        timeRoundingInterval: typeof raw.timeRoundingInterval === "number"
            ? raw.timeRoundingInterval
            : DEFAULT_SETTINGS.timeRoundingInterval,
        stripMarkdown: typeof raw.stripMarkdown === "boolean"
            ? raw.stripMarkdown
            : DEFAULT_SETTINGS.stripMarkdown,
        warnAboutOverlaps: typeof raw.warnAboutOverlaps === "boolean"
            ? raw.warnAboutOverlaps
            : DEFAULT_SETTINGS.warnAboutOverlaps,
        sheetTypes: Array.isArray(raw.sheetTypes)
            ? raw.sheetTypes.map(normalizeSheetType)
            : [],
    };

    if (hasLegacySheetTypeSettings(raw)) {
        applyLegacySheetTypeSettings(settings, raw);
    }

    return settings;
}

/**
 * Turns the settings of the former global timesheet block into a sheet type
 * with an empty code.
 *
 * A version of the plugin older than 1.6.0 kept a sheet type without a code
 * block type, so a vault may already have one — an unfinished type, since it
 * used to be ignored. Such a type is filled in rather than replaced: values
 * the user typed into it are left alone, and the properties it never got are
 * taken from the global settings.
 */
function applyLegacySheetTypeSettings(
    settings: TimesheetSettings,
    raw: LegacyData
): void {
    const existing = findSheetType(settings, "");

    // A converted type is added last, so that the sheet types the user
    // defined keep matching task records first, exactly as they did before
    // the update.
    const sheetType = existing ?? createSheetType();
    const defaults = createSheetType();

    LEGACY_SHEET_TYPE_KEYS.forEach((key) => {
        const value = raw[key];

        if (typeof value === "string" && sheetType[key] === defaults[key]) {
            sheetType[key] = value;
        }
    });

    if (existing === undefined) {
        settings.sheetTypes.push(sheetType);
    }
}

/**
 * Splits a multiline task number patterns setting into a list of patterns,
 * dropping empty lines.
 */
export function getTaskNumberPatterns(
    patternsString: string | undefined
): string[] {
    return (patternsString ?? "")
        .split("\n")
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern !== "");
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
    const title = (sheetType.title ?? "").trim();

    return title === ""
        ? `Insert ${getSheetTypeCodeBlockName(normalizeSheetTypeCode(sheetType.code))}`
        : `Insert timesheet (${title})`;
}

/**
 * Returns settings to render a code block with.
 *
 * Patterns and templates are taken from the sheet type the code block
 * belongs to; time rounding and output settings are always global. An empty
 * code means the sheet type of the plain `timesheet` code block.
 */
export function getRenderSettings(
    settings: TimesheetSettings,
    sheetTypeCode: string
): TimesheetRenderSettings {
    const sheetType = findSheetType(settings, sheetTypeCode);

    if (sheetType === undefined) {
        throw new Error(
            `Sheet type "${getSheetTypeCodeBlockName(sheetTypeCode)}" is not defined in the plugin settings.`
        );
    }

    return {
        roundUpTime: settings.roundUpTime,
        timeRoundingInterval: settings.timeRoundingInterval,
        stripMarkdown: settings.stripMarkdown,
        warnAboutOverlaps: settings.warnAboutOverlaps,
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

        new Setting(containerEl)
            .setName("Warn about overlapping tasks")
            .setDesc(
                "Shows a warning above a report when task records in a note cover the same part of a day, even if the records belong to the same task."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.warnAboutOverlaps)
                    .onChange(async (value) => {
                        this.plugin.settings.warnAboutOverlaps = value;
                        await this.plugin.saveSettings();
                    })
            );

        this.displaySheetTypes(containerEl);
	}

    private displaySheetTypes(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Sheet types")
            .setDesc(
                `Sheet types define the timesheet code blocks you can use. Each type has its own code block name, task number patterns, and templates. A type with an empty code block type describes the plain "${DEFAULT_CODE_BLOCK}" code block.`
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
                text: `No sheet types are defined yet, so no timesheet code block is rendered. Add a type with an empty code block type to get the plain "${DEFAULT_CODE_BLOCK}" one, or fill the field in to get a "${SHEET_TYPE_CODE_BLOCK_PREFIX}" one.`,
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
                `An identifier without spaces. It is added to the "${SHEET_TYPE_CODE_BLOCK_PREFIX}" prefix: for example, "hobby" makes the plugin render "${getSheetTypeCodeBlockName("hobby")}" code blocks. Leave the field empty to describe the plain "${DEFAULT_CODE_BLOCK}" code block.`
            )
            .addText((text) =>
                text
                    .setPlaceholder("hobby")
                    .setValue(sheetType.code ?? "")
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
                    .setValue(sheetType.title ?? "")
                    .onChange(async (value) => {
                        sheetType.title = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl)
            .setName("Default task number pattern")
            .setDesc(
                "Patterns applied to task records of this sheet type, one pattern per line. They are used by the code blocks of this type that have no patterns of their own."
            )
            .setClass("text-snippets-class")
            .addTextArea((text) =>
                text
                    .setValue(sheetType.defaultTaskNumberPatterns ?? "")
                    .onChange(async (value) => {
                        sheetType.defaultTaskNumberPatterns = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl).setName("Output").setHeading();

        new Setting(sheetTypeEl)
            .setName("Text before task")
            .setDesc(
                "A text shown before task records matching the patterns of this sheet type. It belongs to the note view only: the text is not saved to the note and is not used in reports."
            )
            .addText((text) =>
                text
                    .setPlaceholder("💼 ")
                    .setValue(sheetType.textBeforeTask ?? "")
                    .onChange(async (value) => {
                        sheetType.textBeforeTask = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl)
            .setName("Text after task")
            .setDesc(
                "Works like the setting above, but the text is shown after a task record. Both settings are empty by default, and leading and trailing spaces in them are kept."
            )
            .addText((text) =>
                text
                    .setPlaceholder(" (work)")
                    .setValue(sheetType.textAfterTask ?? "")
                    .onChange(async (value) => {
                        sheetType.textAfterTask = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(sheetTypeEl).setName("Templates").setHeading();

        this.displayTemplateSettings(sheetTypeEl, sheetType);
    }

    private getSheetTypeHeading(sheetType: SheetTypeSettings): string {
        const codeBlock = getSheetTypeCodeBlockName(
            normalizeSheetTypeCode(sheetType.code)
        );

        const title = (sheetType.title ?? "").trim();

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
