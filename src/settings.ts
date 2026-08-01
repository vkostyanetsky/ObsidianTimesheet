import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import Timesheet from "./main";

export const SHEET_TYPE_CODE_BLOCK_PREFIX = "timesheet-";

/**
 * The ending of the name of a query code block: the one reporting on the
 * daily notes of a date range instead of the note it belongs to.
 */
export const SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX = "-query";

/** The code blocks rendered by a sheet type with an empty code. */
export const DEFAULT_CODE_BLOCK = "timesheet";
export const DEFAULT_QUERY_CODE_BLOCK = "timesheet-query";

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

/**
 * Brings a code block type to the shape the plugin builds code block names
 * from.
 *
 * Both the `timesheet-` prefix and the `-query` suffix are added by the
 * plugin, so a code containing them is stripped rather than doubled: a user
 * typing `timesheet-hobby-query` means the very same sheet type as a user
 * typing `hobby`. For the same reason the bare `query` code is read as an
 * empty one — otherwise it would claim the `timesheet-query` block, which
 * belongs to the sheet type of the plain `timesheet` one.
 */
export function normalizeSheetTypeCode(value: string | undefined): string {
    // Characters a code block name cannot contain are dropped before the
    // prefix and the suffix are looked for: a code like "quer.y" becomes
    // "query" and has to be recognized as the reserved word it turned into.
    let code = (value ?? "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^A-Za-z0-9_-]/g, "");

    let previous = "";

    while (code !== previous) {
        previous = code;

        // A dash the code starts or ends with belongs to the prefix or to
        // the suffix, both of which the plugin adds by itself.
        code = code.replace(/^-+/, "").replace(/-+$/, "");

        if (code.toLowerCase().startsWith(SHEET_TYPE_CODE_BLOCK_PREFIX)) {
            code = code.slice(SHEET_TYPE_CODE_BLOCK_PREFIX.length);
        }

        if (code.toLowerCase().endsWith(SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX)) {
            code = code.slice(
                0,
                code.length - SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX.length
            );
        } else if (
            code.toLowerCase() ===
            SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX.slice(1)
        ) {
            code = "";
        }
    }

    return code;
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
 * Returns the name of the query code block a sheet type renders: the name of
 * its usual code block with the `-query` suffix.
 */
export function getSheetTypeQueryCodeBlockName(code: string): string {
    return `${getSheetTypeCodeBlockName(code)}${SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX}`;
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
 * Returns a name for the command inserting a query code block of the sheet
 * type: for example, "Insert timesheet query (Hobby)".
 */
export function getSheetTypeQueryCommandName(
    sheetType: SheetTypeSettings
): string {
    const title = (sheetType.title ?? "").trim();

    return title === ""
        ? `Insert ${getSheetTypeQueryCodeBlockName(normalizeSheetTypeCode(sheetType.code))}`
        : `Insert timesheet query (${title})`;
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

    /**
     * Sheet types whose settings are unfolded.
     *
     * Adding, deleting or moving a sheet type redraws the whole tab, so the
     * unfolded ones are remembered — otherwise every click would collapse the
     * type being worked on. They are remembered by reference rather than by
     * position, so that moving a type keeps it unfolded and doesn't unfold the
     * one it changed places with.
     */
    private readonly expandedSheetTypes = new WeakSet<SheetTypeSettings>();

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
                `Sheet types define the timesheet code blocks you can use. Each type has its own task number patterns and templates, and renders two code blocks: one reporting on the note it is written in, and a "${SHEET_TYPE_QUERY_CODE_BLOCK_SUFFIX.slice(1)}" one reporting on the daily notes of a date range. Task records are matched against the types in the order they are listed here, so keep the more specific ones above.`
            )
            .setHeading()
            .addButton((button) =>
                button
                    .setButtonText("Add sheet type")
                    .setTooltip("Add a new sheet type")
                    .setCta()
                    .onClick(async () => {
                        const sheetType = createSheetType();

                        // A type is added to be filled in, so it is unfolded
                        // right away: an empty collapsed row says nothing
                        // about what is left to type.
                        this.expandedSheetTypes.add(sheetType);
                        this.plugin.settings.sheetTypes.push(sheetType);

                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        if (this.plugin.settings.sheetTypes.length === 0) {
            containerEl.createEl("p", {
                text: `No sheet types are defined yet, so no timesheet code block is rendered. Add a type with an empty code block type to get the plain "${DEFAULT_CODE_BLOCK}" and "${DEFAULT_QUERY_CODE_BLOCK}" ones, or fill the field in to get a "${SHEET_TYPE_CODE_BLOCK_PREFIX}" pair.`,
                cls: "setting-item-description",
            });

            return;
        }

        const listEl = containerEl.createDiv({ cls: "timesheet-sheet-types" });

        this.plugin.settings.sheetTypes.forEach((sheetType, sheetTypeIndex) => {
            this.displaySheetType(listEl, sheetType, sheetTypeIndex);
        });
    }

    /**
     * Draws a row of the sheet types list.
     *
     * A row always shows the name of the code block the type renders together
     * with the two fields defining it, and unfolds into the rest of its
     * settings. The buttons next to them manage the list itself: the order of
     * the types matters, since a task record belongs to the first type whose
     * patterns match it.
     */
    private displaySheetType(
        containerEl: HTMLElement,
        sheetType: SheetTypeSettings,
        sheetTypeIndex: number
    ): void {
        const sheetTypeEl = containerEl.createDiv({
            cls: "timesheet-sheet-type",
        });

        const header = new Setting(sheetTypeEl)
            .setName(this.getSheetTypeCodeBlockLabel(sheetType))
            .setClass("timesheet-sheet-type-header");

        const bodyEl = sheetTypeEl.createDiv({
            cls: "timesheet-sheet-type-body",
        });

        this.displaySheetTypeToggle(sheetTypeEl, header, sheetType);

        header
            .addText((text) => {
                text.inputEl.addClass("timesheet-sheet-type-code");

                this.describeControl(
                    text.inputEl,
                    `Code block type: an identifier without spaces, added to the "${SHEET_TYPE_CODE_BLOCK_PREFIX}" prefix. For example, "hobby" makes the plugin render "${getSheetTypeCodeBlockName("hobby")}" and "${getSheetTypeQueryCodeBlockName("hobby")}" code blocks. Leave it empty to describe the plain "${DEFAULT_CODE_BLOCK}" and "${DEFAULT_QUERY_CODE_BLOCK}" ones.`
                );

                text.setPlaceholder("Code block type")
                    .setValue(sheetType.code ?? "")
                    .onChange(async (value) => {
                        const code = normalizeSheetTypeCode(value);

                        if (code !== value) {
                            text.setValue(code);
                        }

                        sheetType.code = code;

                        // The row is named after the code block the type
                        // renders, so the name follows the field it is built
                        // from instead of waiting for the tab to be redrawn.
                        header.setName(
                            this.getSheetTypeCodeBlockLabel(sheetType)
                        );

                        await this.plugin.saveSettings();
                    });
            })
            .addText((text) => {
                text.inputEl.addClass("timesheet-sheet-type-title");

                this.describeControl(
                    text.inputEl,
                    'Title: a human-friendly name of the sheet type, shown in brackets after the name of the command inserting a code block of this type — for example, "Insert timesheet (Hobby)". If the title is empty, the code block name is used instead.'
                );

                text.setPlaceholder("Title")
                    .setValue(sheetType.title ?? "")
                    .onChange(async (value) => {
                        sheetType.title = value;
                        await this.plugin.saveSettings();
                    });
            })
            .addButton((button) =>
                this.asIconButton(button)
                    .setIcon("arrow-up")
                    .setTooltip("Move up")
                    .setDisabled(sheetTypeIndex === 0)
                    .onClick(async () => {
                        await this.moveSheetType(
                            sheetTypeIndex,
                            sheetTypeIndex - 1
                        );
                    })
            )
            .addButton((button) =>
                this.asIconButton(button)
                    .setIcon("arrow-down")
                    .setTooltip("Move down")
                    .setDisabled(
                        sheetTypeIndex ===
                            this.plugin.settings.sheetTypes.length - 1
                    )
                    .onClick(async () => {
                        await this.moveSheetType(
                            sheetTypeIndex,
                            sheetTypeIndex + 1
                        );
                    })
            )
            .addButton((button) =>
                this.asIconButton(button, "timesheet-sheet-type-delete")
                    .setIcon("trash")
                    .setTooltip("Delete sheet type")
                    .onClick(async () => {
                        this.expandedSheetTypes.delete(sheetType);
                        this.plugin.settings.sheetTypes.splice(
                            sheetTypeIndex,
                            1
                        );

                        await this.plugin.saveSettings();
                        this.display();
                    })
            );

        this.displaySheetTypeBody(bodyEl, sheetType);
    }

    /**
     * Adds the button unfolding a row to the left of its name.
     *
     * A setting puts everything it is given to the right of the name, so the
     * button is built on its own and moved to the beginning of the row.
     */
    private displaySheetTypeToggle(
        sheetTypeEl: HTMLElement,
        header: Setting,
        sheetType: SheetTypeSettings
    ): void {
        const toggle = new ButtonComponent(header.settingEl);

        toggle.buttonEl.addClasses([
            "clickable-icon",
            "timesheet-sheet-type-toggle",
        ]);

        header.settingEl.prepend(toggle.buttonEl);

        const showExpanded = (expanded: boolean): void => {
            sheetTypeEl.toggleClass(
                "timesheet-sheet-type-collapsed",
                !expanded
            );

            toggle
                .setIcon(expanded ? "chevron-down" : "chevron-right")
                .setTooltip(
                    expanded ? "Collapse sheet type" : "Expand sheet type"
                );

            toggle.buttonEl.setAttr("aria-expanded", String(expanded));
        };

        toggle.onClick(() => {
            const expanded = !this.expandedSheetTypes.has(sheetType);

            if (expanded) {
                this.expandedSheetTypes.add(sheetType);
            } else {
                this.expandedSheetTypes.delete(sheetType);
            }

            showExpanded(expanded);
        });

        showExpanded(this.expandedSheetTypes.has(sheetType));
    }

    /** Draws the settings a row of the sheet types list unfolds into. */
    private displaySheetTypeBody(
        containerEl: HTMLElement,
        sheetType: SheetTypeSettings
    ): void {
        new Setting(containerEl)
            .setName("Default task number pattern")
            .setDesc(
                "Patterns applied to task records of this sheet type, one pattern per line. They are used by the code blocks of this type that have no patterns of their own, and always by its query code blocks."
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

        new Setting(containerEl).setName("Output").setHeading();

        new Setting(containerEl)
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

        new Setting(containerEl)
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

        new Setting(containerEl).setName("Templates").setHeading();

        this.displayTemplateSettings(containerEl, sheetType);
    }

    /**
     * Moves a sheet type to another place in the list, redrawing the tab so
     * that the rows are numbered anew.
     */
    private async moveSheetType(from: number, to: number): Promise<void> {
        const sheetTypes = this.plugin.settings.sheetTypes;

        if (to < 0 || to >= sheetTypes.length) {
            return;
        }

        const [sheetType] = sheetTypes.splice(from, 1);

        sheetTypes.splice(to, 0, sheetType);

        await this.plugin.saveSettings();
        this.display();
    }

    /**
     * Turns a button into an icon-sized one.
     *
     * An extra button would look the same, but it is a div rather than a
     * button, so it cannot be reached with a keyboard.
     */
    private asIconButton(
        button: ButtonComponent,
        ...classes: string[]
    ): ButtonComponent {
        button.buttonEl.addClasses(["clickable-icon", ...classes]);

        return button;
    }

    /**
     * Explains a control of a sheet type row.
     *
     * Rows have no room for descriptions, so the text of a field is shown as
     * a tooltip — the very same label a screen reader announces.
     */
    private describeControl(el: HTMLElement, description: string): void {
        el.setAttr("aria-label", description);
        el.setAttr("data-tooltip-position", "top");
    }

    /** Returns the name of the code block a sheet type renders. */
    private getSheetTypeCodeBlockLabel(sheetType: SheetTypeSettings): string {
        return getSheetTypeCodeBlockName(
            normalizeSheetTypeCode(sheetType.code)
        );
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
