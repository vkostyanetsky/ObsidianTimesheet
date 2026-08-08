import { describe, expect, it } from "vitest";

import {
	DEFAULT_TEMPLATES,
	SheetTypeSettings,
	TimesheetSettings,
	createSheetType,
	findSheetType,
	getRenderSettings,
	getSheetTypeCodeBlockName,
	getSheetTypeCommandName,
	getSheetTypeQueryCodeBlockName,
	getSheetTypeQueryCommandName,
	getTaskNumberPatterns,
	hasLegacySheetTypeSettings,
	normalizeSheetType,
	normalizeSheetTypeCode,
	parseSettings,
} from "../src/settings";

function sheetType(values: Partial<SheetTypeSettings>): SheetTypeSettings {
	return Object.assign(createSheetType(), values);
}

function settingsWith(...sheetTypes: SheetTypeSettings[]): TimesheetSettings {
	return parseSettings({ sheetTypes });
}

describe("normalizeSheetTypeCode", () => {
	it("keeps a code that is already an identifier", () => {
		expect(normalizeSheetTypeCode("hobby")).toBe("hobby");
	});

	it("reads a missing code as an empty one", () => {
		expect(normalizeSheetTypeCode(undefined)).toBe("");
		expect(normalizeSheetTypeCode("   ")).toBe("");
	});

	it("turns the spaces of a code into dashes", () => {
		expect(normalizeSheetTypeCode("  my  hobby  ")).toBe("my-hobby");
	});

	it("drops the characters a code block name cannot contain", () => {
		expect(normalizeSheetTypeCode("ho!bb?y")).toBe("hobby");
	});

	it("drops the dashes a code starts or ends with", () => {
		expect(normalizeSheetTypeCode("--hobby--")).toBe("hobby");
	});

	it("strips the prefix the plugin adds by itself", () => {
		expect(normalizeSheetTypeCode("timesheet-hobby")).toBe("hobby");
	});

	it("strips the suffix the plugin adds by itself", () => {
		expect(normalizeSheetTypeCode("hobby-query")).toBe("hobby");
	});

	it("strips a whole code block name back to its code", () => {
		expect(normalizeSheetTypeCode("timesheet-hobby-query")).toBe("hobby");
	});

	it("reads the reserved word as an empty code", () => {
		expect(normalizeSheetTypeCode("query")).toBe("");
		expect(normalizeSheetTypeCode("timesheet-query")).toBe("");
	});

	it("reads a word that becomes the reserved one as an empty code", () => {
		expect(normalizeSheetTypeCode("quer.y")).toBe("");
	});
});

describe("code block names", () => {
	it("names the blocks of a sheet type without a code", () => {
		expect(getSheetTypeCodeBlockName("")).toBe("timesheet");
		expect(getSheetTypeQueryCodeBlockName("")).toBe("timesheet-query");
	});

	it("names the blocks of a sheet type with a code", () => {
		expect(getSheetTypeCodeBlockName("hobby")).toBe("timesheet-hobby");
		expect(getSheetTypeQueryCodeBlockName("hobby")).toBe(
			"timesheet-hobby-query"
		);
	});
});

describe("command names", () => {
	it("names a command after the code block when there is no title", () => {
		expect(getSheetTypeCommandName(sheetType({ code: "" }))).toBe(
			"Insert timesheet"
		);
		expect(getSheetTypeCommandName(sheetType({ code: "hobby" }))).toBe(
			"Insert timesheet-hobby"
		);
		expect(getSheetTypeQueryCommandName(sheetType({ code: "hobby" }))).toBe(
			"Insert timesheet-hobby-query"
		);
	});

	it("names a command after the title when there is one", () => {
		const hobby = sheetType({ code: "hobby", title: "Hobby" });

		expect(getSheetTypeCommandName(hobby)).toBe("Insert timesheet (Hobby)");
		expect(getSheetTypeQueryCommandName(hobby)).toBe(
			"Insert timesheet query (Hobby)"
		);
	});

	it("does not count a blank title as a title", () => {
		expect(getSheetTypeCommandName(sheetType({ title: "  " }))).toBe(
			"Insert timesheet"
		);
	});

	it("names a command after the code the plugin uses, not the one typed", () => {
		expect(
			getSheetTypeCommandName(sheetType({ code: "timesheet-hobby-query" }))
		).toBe("Insert timesheet-hobby");
	});
});

describe("getTaskNumberPatterns", () => {
	it("splits a setting into a pattern per line", () => {
		expect(getTaskNumberPatterns("TASK-\\d+\nBUG-\\d+")).toEqual([
			"TASK-\\d+",
			"BUG-\\d+",
		]);
	});

	it("drops blank lines and surrounding spaces", () => {
		expect(getTaskNumberPatterns("\n  TASK-\\d+  \n\n  \n")).toEqual([
			"TASK-\\d+",
		]);
	});

	it("reads a missing setting as no patterns", () => {
		expect(getTaskNumberPatterns(undefined)).toEqual([]);
		expect(getTaskNumberPatterns("")).toEqual([]);
	});
});

describe("normalizeSheetType", () => {
	it("fills a sheet type in with the defaults", () => {
		expect(normalizeSheetType({ code: "hobby" })).toEqual({
			code: "hobby",
			title: "",
			defaultTaskNumberPatterns: "",
			textBeforeTask: "",
			textAfterTask: "",
			...DEFAULT_TEMPLATES,
		});
	});

	it("reads a missing sheet type as a new one", () => {
		expect(normalizeSheetType(undefined)).toEqual(createSheetType());
		expect(normalizeSheetType(null)).toEqual(createSheetType());
	});

	it("keeps the values a sheet type has", () => {
		expect(
			normalizeSheetType({ templateFooter: "the end" }).templateFooter
		).toBe("the end");
	});
});

describe("hasLegacySheetTypeSettings", () => {
	it("recognizes the settings of a version without sheet types", () => {
		expect(hasLegacySheetTypeSettings({ templateHeader: "> a" })).toBe(true);
		expect(
			hasLegacySheetTypeSettings({ defaultTaskNumberPatterns: "TASK-\\d+" })
		).toBe(true);
	});

	it("does not recognize the settings of the current version", () => {
		expect(hasLegacySheetTypeSettings({ sheetTypes: [] })).toBe(false);
		expect(hasLegacySheetTypeSettings({})).toBe(false);
		expect(hasLegacySheetTypeSettings(null)).toBe(false);
		expect(hasLegacySheetTypeSettings(undefined)).toBe(false);
	});
});

describe("parseSettings", () => {
	it("reads a fresh install as the defaults", () => {
		expect(parseSettings(null)).toEqual({
			roundUpTime: false,
			timeRoundingInterval: 15,
			stripMarkdown: false,
			warnAboutOverlaps: true,
			sheetTypes: [],
		});
	});

	it("reads the settings of the plugin", () => {
		expect(
			parseSettings({
				roundUpTime: true,
				timeRoundingInterval: 60,
				stripMarkdown: true,
				warnAboutOverlaps: false,
				sheetTypes: [],
			})
		).toEqual({
			roundUpTime: true,
			timeRoundingInterval: 60,
			stripMarkdown: true,
			warnAboutOverlaps: false,
			sheetTypes: [],
		});
	});

	it("falls back to a default when a setting is of the wrong type", () => {
		const settings = parseSettings({
			roundUpTime: "yes",
			timeRoundingInterval: "30",
			sheetTypes: "none",
		});

		expect(settings.roundUpTime).toBe(false);
		expect(settings.timeRoundingInterval).toBe(15);
		expect(settings.sheetTypes).toEqual([]);
	});

	it("fills the sheet types in with the properties they lack", () => {
		const settings = parseSettings({ sheetTypes: [{ code: "hobby" }] });

		expect(settings.sheetTypes).toEqual([sheetType({ code: "hobby" })]);
	});

	it("turns the settings of an older version into a sheet type", () => {
		const settings = parseSettings({
			defaultTaskNumberPatterns: "TASK-\\d+",
			templateHeader: "> a header",
		});

		expect(settings.sheetTypes).toEqual([
			sheetType({
				defaultTaskNumberPatterns: "TASK-\\d+",
				templateHeader: "> a header",
			}),
		]);
	});

	it("adds a converted sheet type after the ones the user defined", () => {
		const settings = parseSettings({
			sheetTypes: [{ code: "hobby" }],
			templateHeader: "> a header",
		});

		expect(settings.sheetTypes.map((type) => type.code)).toEqual([
			"hobby",
			"",
		]);
	});

	it("fills an unfinished sheet type in instead of adding another one", () => {
		const settings = parseSettings({
			sheetTypes: [{ code: "", title: "Work", templateHeader: "> mine" }],
			templateHeader: "> legacy",
			templateFooter: "> a footer",
		});

		expect(settings.sheetTypes).toHaveLength(1);
		// A value the user typed is left alone, and only the properties the
		// sheet type never got are taken from the settings being converted.
		expect(settings.sheetTypes[0].templateHeader).toBe("> mine");
		expect(settings.sheetTypes[0].templateFooter).toBe("> a footer");
		expect(settings.sheetTypes[0].title).toBe("Work");
	});
});

describe("findSheetType", () => {
	it("finds a sheet type by the code the plugin uses", () => {
		const hobby = sheetType({ code: "timesheet-hobby" });
		const settings = settingsWith(hobby);

		expect(findSheetType(settings, "hobby")).toEqual(hobby);
	});

	it("finds the sheet type of the plain code block", () => {
		const settings = settingsWith(sheetType({ code: "" }));

		expect(findSheetType(settings, "")).toBeDefined();
	});

	it("returns nothing when there is no such sheet type", () => {
		expect(findSheetType(settingsWith(), "hobby")).toBeUndefined();
	});
});

describe("getRenderSettings", () => {
	it("takes the patterns and the templates from the sheet type", () => {
		const settings = settingsWith(
			sheetType({
				code: "hobby",
				defaultTaskNumberPatterns: "HOBBY-\\d+",
				templateHeader: "> a header",
			})
		);

		settings.roundUpTime = true;
		settings.timeRoundingInterval = 30;
		settings.stripMarkdown = true;
		settings.warnAboutOverlaps = false;

		expect(getRenderSettings(settings, "hobby")).toEqual({
			roundUpTime: true,
			timeRoundingInterval: 30,
			stripMarkdown: true,
			warnAboutOverlaps: false,
			defaultTaskNumberPatterns: "HOBBY-\\d+",
			templateHeader: "> a header",
			templateDuration: DEFAULT_TEMPLATES.templateDuration,
			templateTask: DEFAULT_TEMPLATES.templateTask,
			templateTaskLog: DEFAULT_TEMPLATES.templateTaskLog,
			templateFooter: DEFAULT_TEMPLATES.templateFooter,
		});
	});

	it("refuses to render a code block of a sheet type that is gone", () => {
		expect(() => getRenderSettings(settingsWith(), "hobby")).toThrow(
			'Sheet type "timesheet-hobby" is not defined in the plugin settings.'
		);
	});

	it("names the plain code block when its sheet type is gone", () => {
		expect(() => getRenderSettings(settingsWith(), "")).toThrow(
			'Sheet type "timesheet" is not defined in the plugin settings.'
		);
	});
});
