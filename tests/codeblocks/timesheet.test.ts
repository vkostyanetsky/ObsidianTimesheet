import { describe, expect, it } from "vitest";

import TimesheetCodeBlock from "../../src/codeblocks/timesheet";
import { DEFAULT_TEMPLATES, TimesheetRenderSettings } from "../../src/settings";

function renderSettings(
	values: Partial<TimesheetRenderSettings> = {}
): TimesheetRenderSettings {
	return {
		defaultTaskNumberPatterns: "TASK-\\d+",
		roundUpTime: false,
		timeRoundingInterval: 15,
		stripMarkdown: false,
		warnAboutOverlaps: true,
		...DEFAULT_TEMPLATES,
		...values,
	};
}

function note(...lines: string[]): string {
	return lines.join("\n");
}

describe("TimesheetCodeBlock.buildOutput", () => {
	it("builds a report out of the task records of a note", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings(),
			"",
			note(
				"# Thursday",
				"",
				"- [x] 10:00-11:00 TASK-1 first thing",
				"- [x] 11:00-12:00 TASK-2 second thing",
				"- [ ] 13:00-13:30 TASK-1 third thing"
			)
		);

		expect(output).toBe(
			note(
				"> [!summary] Timesheet (2h 30m)",
				"> ",
				"> TASK-1 (1h 30m)",
				"> - first thing",
				"> - third thing",
				"> ",
				"> TASK-2 (1h)",
				"> - second thing"
			)
		);
	});

	it("leaves out the records naming no task", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings(),
			"",
			note("- [x] 10:00-11:00 TASK-1 a", "- [x] 11:00-12:00 a lunch break")
		);

		expect(output).not.toContain("lunch");
		expect(output).toContain("> [!summary] Timesheet (1h)");
	});

	it("puts the longest task first", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings(),
			"",
			note(
				"- [x] 10:00-10:30 TASK-1 a",
				"- [x] 11:00-13:00 TASK-2 b",
				"- [x] 14:00-15:00 TASK-3 c"
			)
		);

		expect(output.match(/TASK-\d/g)).toEqual(["TASK-2", "TASK-3", "TASK-1"]);
	});

	it("cuts the interval and the task number out of a log title", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateHeader: "", templateTask: "" }),
			"",
			"- [x] 10:00-11:00 TASK-1 (writing tests)"
		);

		expect(output).toBe("> - (writing tests)");
	});

	it("drops the brackets a cut-out task number leaves empty", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateHeader: "", templateTask: "" }),
			"",
			"- [x] 10:00-11:00 writing tests (TASK-1)"
		);

		expect(output).toBe("> - writing tests");
	});

	it("mentions a log title of a task once", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateHeader: "", templateTask: "" }),
			"",
			note("- [x] 10:00-11:00 TASK-1 a", "- [x] 12:00-13:00 TASK-1 a")
		);

		expect(output).toBe("> - a");
	});

	it("counts the time of a record crossing midnight", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateTask: "", templateTaskLog: "" }),
			"",
			"- [x] 23:00-02:00 TASK-1 a night shift"
		);

		expect(output).toBe("> [!summary] Timesheet (3h)");
	});

	it("counts a record naming a task but taking no time", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateHeader: "", templateTaskLog: "" }),
			"",
			"- [ ] TASK-1 not started yet"
		);

		// A task with no time behind it has no duration to show, so only its
		// number gets into the report.
		expect(output).toBe("> \n> TASK-1 ");
	});

	it("builds a report out of an empty note", () => {
		const output = TimesheetCodeBlock.buildOutput(renderSettings(), "", "");

		expect(output).toBe("> [!summary] Timesheet ");
	});
});

describe("TimesheetCodeBlock.buildOutput: task number patterns", () => {
	it("takes the patterns of the sheet type when the block is empty", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ defaultTaskNumberPatterns: "BUG-\\d+" }),
			"   \n  ",
			"- [x] 10:00-11:00 BUG-7 a"
		);

		expect(output).toContain("> BUG-7 (1h)");
	});

	it("prefers the patterns written in the block", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ defaultTaskNumberPatterns: "TASK-\\d+" }),
			"BUG-\\d+",
			note("- [x] 10:00-11:00 TASK-1 a", "- [x] 11:00-12:00 BUG-7 b")
		);

		expect(output).toContain("BUG-7");
		expect(output).not.toContain("TASK-1");
	});

	it("reads a pattern per line of the block", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings(),
			"TASK-\\d+\nBUG-\\d+",
			note("- [x] 10:00-11:00 TASK-1 a", "- [x] 11:00-12:00 BUG-7 b")
		);

		expect(output).toContain("TASK-1");
		expect(output).toContain("BUG-7");
	});
});

describe("TimesheetCodeBlock.buildOutput: time rounding", () => {
	it("rounds the time of a task up to the interval", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				roundUpTime: true,
				timeRoundingInterval: 15,
				templateTask: "",
				templateTaskLog: "",
			}),
			"",
			"- [x] 10:00-10:20 TASK-1 a"
		);

		expect(output).toBe("> [!summary] Timesheet (30m)");
	});

	it("rounds every task on its own, not the total", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				roundUpTime: true,
				timeRoundingInterval: 60,
				templateTaskLog: "",
			}),
			"",
			note("- [x] 10:00-10:20 TASK-1 a", "- [x] 11:00-11:10 TASK-2 b")
		);

		expect(output).toBe(
			note(
				"> [!summary] Timesheet (2h)",
				"> ",
				"> TASK-1 (1h)",
				"> ",
				"> TASK-2 (1h)"
			)
		);
	});

	it("leaves the time alone when rounding is off", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateTask: "", templateTaskLog: "" }),
			"",
			"- [x] 10:00-10:20 TASK-1 a"
		);

		expect(output).toBe("> [!summary] Timesheet (20m)");
	});
});

describe("TimesheetCodeBlock.buildOutput: templates", () => {
	it("renders a report with templates of its own", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				templateHeader: "| Task | Time |\n| --- | --- |",
				templateDuration: "{duration}",
				templateTask: "| {taskNumber} | {taskDuration} |",
				templateTaskLog: "",
				templateFooter: "",
			}),
			"",
			"- [x] 10:00-11:30 TASK-1 a"
		);

		expect(output).toBe(
			note("| Task | Time |", "| --- | --- |", "| TASK-1 | 1h 30m |")
		);
	});

	it("adds a footer to a report", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateTaskLog: "", templateFooter: "> \n> Done." }),
			"",
			"- [x] 10:00-11:00 TASK-1 a"
		);

		expect(output).toBe(
			note(
				"> [!summary] Timesheet (1h)",
				"> ",
				"> TASK-1 (1h)",
				"> ",
				"> Done."
			)
		);
	});

	it("builds a report out of a footer alone", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				templateHeader: "",
				templateTask: "",
				templateTaskLog: "",
				templateFooter: "nothing but a footer",
			}),
			"",
			"- [x] 10:00-11:00 TASK-1 a"
		);

		expect(output).toBe("nothing but a footer");
	});

	it("builds an empty report when every template is empty", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				templateHeader: "",
				templateTask: "",
				templateTaskLog: "",
				templateFooter: "",
			}),
			"",
			"- [x] 10:00-11:00 TASK-1 a"
		);

		expect(output).toBe("");
	});

	it("shows a duration without the template when there is none", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				templateDuration: "",
				templateTask: "",
				templateTaskLog: "",
			}),
			"",
			"- [x] 10:00-11:00 TASK-1 a"
		);

		expect(output).toBe("> [!summary] Timesheet 1h");
	});
});

describe("TimesheetCodeBlock.buildOutput: Markdown formatting", () => {
	const markdownNote = note(
		"- [x] 10:00-11:00 [[TASK-1]] **writing** `tests`",
		"- [x] 11:00-12:00 [[TASK-2|the other one]] a [link](https://example.com)"
	);

	it("keeps the formatting of a note by default", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ defaultTaskNumberPatterns: "\\[\\[.*?\\]\\]" }),
			"",
			markdownNote
		);

		expect(output).toContain("> [[TASK-1]] (1h)");
		expect(output).toContain("> - **writing** `tests`");
	});

	it("removes the formatting when it is asked to", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({
				stripMarkdown: true,
				defaultTaskNumberPatterns: "\\[\\[.*?\\]\\]",
			}),
			"",
			markdownNote
		);

		expect(output).toContain("> TASK-1 (1h)");
		expect(output).toContain("> - writing tests");
		expect(output).toContain("> the other one (1h)");
		expect(output).toContain("> - a link");
	});

	it("keeps the Markdown of the templates", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ stripMarkdown: true }),
			"",
			"- [x] 10:00-11:00 TASK-1 **a**"
		);

		expect(output).toContain("> [!summary] Timesheet (1h)");
		expect(output).toContain("> - a");
	});
});

describe("TimesheetCodeBlock.buildOutput: overlapping records", () => {
	const overlappingNote = note(
		"- [x] 10:00-11:30 TASK-1 a",
		"- [x] 10:30-11:30 TASK-2 b"
	);

	it("warns above a report when records cover the same part of a day", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ templateTaskLog: "" }),
			"",
			overlappingNote
		);

		expect(output).toBe(
			note(
				"> [!warning] Overlapping tasks",
				"> - 10:00-11:30 TASK-1 a ↔ 10:30-11:30 TASK-2 b",
				"",
				"> [!summary] Timesheet (2h 30m)",
				"> ",
				"> TASK-1 (1h 30m)",
				"> ",
				"> TASK-2 (1h)"
			)
		);
	});

	it("keeps quiet when the warning is turned off", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ warnAboutOverlaps: false, templateTaskLog: "" }),
			"",
			overlappingNote
		);

		expect(output).not.toContain("Overlapping tasks");
	});

	it("removes the formatting of the records it warns about", () => {
		const output = TimesheetCodeBlock.buildOutput(
			renderSettings({ stripMarkdown: true, templateTaskLog: "" }),
			"",
			note(
				"- [x] 10:00-11:00 TASK-1 **a**",
				"- [x] 10:30-11:30 TASK-2 __b__"
			)
		);

		expect(output).toContain(
			"> - 10:00-11:00 TASK-1 a ↔ 10:30-11:30 TASK-2 b"
		);
	});
});

describe("TimesheetCodeBlock.buildReport", () => {
	it("builds a single report out of the notes of a range", () => {
		const output = TimesheetCodeBlock.buildReport(
			renderSettings({ templateTaskLog: "" }),
			["TASK-\\d+"],
			[
				"- [x] 10:00-11:00 TASK-1 monday",
				"- [x] 10:00-11:00 TASK-1 tuesday",
				"- [x] 09:00-09:30 TASK-2 tuesday",
			]
		);

		expect(output).toBe(
			note(
				"> [!summary] Timesheet (2h 30m)",
				"> ",
				"> TASK-1 (2h)",
				"> ",
				"> TASK-2 (30m)"
			)
		);
	});

	it("does not report records of different notes as overlapping", () => {
		const output = TimesheetCodeBlock.buildReport(
			renderSettings({ templateTaskLog: "" }),
			["TASK-\\d+"],
			["- [x] 10:00-11:00 TASK-1 monday", "- [x] 10:00-11:00 TASK-2 tuesday"]
		);

		expect(output).not.toContain("Overlapping tasks");
	});

	it("reports records of one and the same note as overlapping", () => {
		const output = TimesheetCodeBlock.buildReport(
			renderSettings({ templateTaskLog: "" }),
			["TASK-\\d+"],
			[
				note("- [x] 10:00-11:00 TASK-1 a", "- [x] 10:30-11:30 TASK-2 b"),
				"- [x] 14:00-15:00 TASK-3 c",
			]
		);

		expect(output).toContain("> [!warning] Overlapping tasks");
		expect(output.match(/^> - /gm)).toHaveLength(1);
	});

	it("builds a report out of no notes at all", () => {
		const output = TimesheetCodeBlock.buildReport(
			renderSettings(),
			["TASK-\\d+"],
			[]
		);

		expect(output).toBe("> [!summary] Timesheet ");
	});
});
