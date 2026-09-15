import { beforeEach, describe, expect, it } from "vitest";

import { EditorState } from "@codemirror/state";
import { EditorView, WidgetType } from "@codemirror/view";

import {
	createTaskDecorationExtension,
	decorateTasksInReadingView,
	getTaskAffixes,
} from "../src/decorations";

import {
	SheetTypeSettings,
	TimesheetSettings,
	createSheetType,
	parseSettings,
} from "../src/settings";

function settingsWith(
	...sheetTypes: Partial<SheetTypeSettings>[]
): TimesheetSettings {
	return parseSettings({
		sheetTypes: sheetTypes.map((values) =>
			Object.assign(createSheetType(), values)
		),
	});
}

const WORK = {
	code: "work",
	defaultTaskNumberPatterns: "WORK-\\d+",
	textBeforeTask: "💼 ",
	textAfterTask: " (work)",
};

const HOBBY = {
	code: "hobby",
	defaultTaskNumberPatterns: "HOBBY-\\d+",
	textBeforeTask: "🎸 ",
};

describe("getTaskAffixes", () => {
	it("returns the texts of the sheet type a record belongs to", () => {
		expect(getTaskAffixes(settingsWith(WORK), "WORK-1 a")).toEqual({
			before: "💼 ",
			after: " (work)",
		});
	});

	it("returns nothing for a record of no sheet type", () => {
		expect(getTaskAffixes(settingsWith(WORK), "a walk")).toEqual({
			before: "",
			after: "",
		});
	});

	it("returns nothing when there are no sheet types", () => {
		expect(getTaskAffixes(settingsWith(), "WORK-1 a")).toEqual({
			before: "",
			after: "",
		});
	});

	it("uses the first sheet type whose patterns match", () => {
		const settings = settingsWith(WORK, HOBBY);

		expect(getTaskAffixes(settings, "HOBBY-1 a").before).toBe("🎸 ");
		expect(getTaskAffixes(settings, "WORK-1 a").before).toBe("💼 ");
	});

	it("stops at a matching sheet type even when it has no texts", () => {
		// A record belongs to one sheet type, so it must not get the text of
		// another one just because its own has nothing to show.
		const settings = settingsWith(
			{ code: "work", defaultTaskNumberPatterns: "WORK-\\d+" },
			{
				code: "any",
				defaultTaskNumberPatterns: "\\w+-\\d+",
				textBeforeTask: "❓ ",
			}
		);

		expect(getTaskAffixes(settings, "WORK-1 a")).toEqual({
			before: "",
			after: "",
		});
	});

	it("skips a sheet type without patterns", () => {
		const settings = settingsWith(
			{ code: "work", textBeforeTask: "💼 " },
			HOBBY
		);

		expect(getTaskAffixes(settings, "HOBBY-1 a").before).toBe("🎸 ");
	});

	it("skips a sheet type whose code block belongs to an earlier one", () => {
		// Only one sheet type renders a code block, so the second one is dead
		// and has no records of its own.
		const settings = settingsWith(WORK, {
			code: "work",
			defaultTaskNumberPatterns: "\\w+-\\d+",
			textBeforeTask: "🧟 ",
		});

		expect(getTaskAffixes(settings, "HOBBY-1 a")).toEqual({
			before: "",
			after: "",
		});
	});
});

/**
 * Returns the texts the editor shows around the records of a note, told
 * apart by the line and the side they belong to: `2:before:@ `.
 */
function affixesInEditor(
	settings: TimesheetSettings,
	...lines: string[]
): string[] {
	const extension = createTaskDecorationExtension(() => settings);
	const view = new EditorView({
		state: EditorState.create({ doc: "", extensions: [extension] }),
		parent: document.body.appendChild(document.createElement("div")),
	});

	// A view of a test shows nothing until its viewport is measured, so the
	// note is typed into an empty view instead of being given to it at once.
	view.dispatch({ changes: { from: 0, insert: lines.join("\n") } });

	const result: string[] = [];
	const decorations = view.plugin(extension)?.decorations;
	const cursor = decorations?.iter();

	while (cursor !== undefined && cursor.value !== null) {
		const widget = cursor.value.spec.widget as WidgetType;
		const el = widget.toDOM(view);
		const side = el.className.includes("-before") ? "before" : "after";

		result.push(
			`${view.state.doc.lineAt(cursor.from).number}:${side}:${el.textContent}`
		);

		cursor.next();
	}

	view.destroy();

	return result;
}

describe("createTaskDecorationExtension", () => {
	it("shows the texts of a sheet type around a record", () => {
		expect(
			affixesInEditor(settingsWith(WORK), "- [ ] WORK-1 a")
		).toEqual(["1:before:💼 ", "1:after: (work)"]);
	});

	it("shows nothing around a record of a fenced code block", () => {
		// Such a record is a sample of a record: the note only tells about it
		// instead of writing it down.
		expect(
			affixesInEditor(
				settingsWith(WORK),
				"```",
				"- [ ] WORK-1 a sample",
				"```"
			)
		).toEqual([]);
	});

	it("shows the texts around the records a code block stands between", () => {
		expect(
			affixesInEditor(
				settingsWith(HOBBY),
				"- [ ] HOBBY-1 a",
				"```",
				"- [ ] HOBBY-2 a sample",
				"```",
				"- [ ] HOBBY-3 b"
			)
		).toEqual(["1:before:🎸 ", "5:before:🎸 "]);
	});

	it("shows nothing around the records below a code block left unclosed", () => {
		expect(
			affixesInEditor(
				settingsWith(HOBBY),
				"- [ ] HOBBY-1 a",
				"~~~",
				"- [ ] HOBBY-2 a sample"
			)
		).toEqual(["1:before:🎸 "]);
	});

	it("shows the texts around a record with an inline code span in it", () => {
		expect(
			affixesInEditor(
				settingsWith(HOBBY),
				"- [ ] HOBBY-1 publishing ```EInvoicing```",
				"- [ ] HOBBY-2 b"
			)
		).toEqual(["1:before:🎸 ", "2:before:🎸 "]);
	});
});

describe("decorateTasksInReadingView", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.replaceChildren(container);
	});

	function renderTasks(...items: string[]): void {
		container.innerHTML = `<ul>${items
			.map(
				(item) =>
					`<li class="task-list-item"><input type="checkbox">${item}</li>`
			)
			.join("")}</ul>`;
	}

	function taskEl(index = 0): HTMLElement {
		return container.querySelectorAll<HTMLElement>("li.task-list-item")[
			index
		];
	}

	it("shows the texts of a sheet type around a record", () => {
		renderTasks(" WORK-1 a");

		decorateTasksInReadingView(settingsWith(WORK), container);

		expect(taskEl().textContent).toBe("💼  WORK-1 a (work)");
	});

	it("keeps the text of a record out of the texts around it", () => {
		renderTasks(" WORK-1 a");

		decorateTasksInReadingView(settingsWith(WORK), container);

		const content = taskEl().querySelector(".timesheet-task-content");

		expect(content?.textContent).toBe(" WORK-1 a");
	});

	it("puts the texts on the sides they belong to", () => {
		renderTasks(" WORK-1 a");

		decorateTasksInReadingView(settingsWith(WORK), container);

		expect(
			Array.from(taskEl().children).map((child) => child.className)
		).toEqual([
			"",
			"timesheet-task-affix timesheet-task-affix-before",
			"timesheet-task-content",
			"timesheet-task-affix timesheet-task-affix-after",
		]);
	});

	it("leaves a record of no sheet type alone", () => {
		renderTasks(" a walk");

		decorateTasksInReadingView(settingsWith(WORK), container);

		expect(taskEl().querySelector(".timesheet-task-affix")).toBeNull();
		expect(taskEl().textContent).toBe(" a walk");
	});

	it("adds no text a sheet type does not have", () => {
		renderTasks(" HOBBY-1 a");

		decorateTasksInReadingView(settingsWith(HOBBY), container);

		expect(
			taskEl().querySelector(".timesheet-task-affix-after")
		).toBeNull();
		expect(taskEl().textContent).toBe("🎸  HOBBY-1 a");
	});

	it("decorates a record once, no matter how often it is rendered", () => {
		renderTasks(" WORK-1 a");

		const settings = settingsWith(WORK);

		decorateTasksInReadingView(settings, container);
		decorateTasksInReadingView(settings, container);
		decorateTasksInReadingView(settings, container);

		expect(taskEl().querySelectorAll(".timesheet-task-affix")).toHaveLength(
			2
		);
		expect(taskEl().textContent).toBe("💼  WORK-1 a (work)");
	});

	it("updates the texts when the settings change", () => {
		renderTasks(" WORK-1 a");

		decorateTasksInReadingView(settingsWith(WORK), container);
		decorateTasksInReadingView(
			settingsWith({ ...WORK, textBeforeTask: "🔧 ", textAfterTask: "" }),
			container
		);

		expect(taskEl().textContent).toBe("🔧  WORK-1 a");
		expect(
			taskEl().querySelector(".timesheet-task-affix-after")
		).toBeNull();
	});

	it("leaves a nested list out of the record it belongs to", () => {
		container.innerHTML = [
			'<ul><li class="task-list-item"><input type="checkbox"> WORK-1 a',
			'<ul><li class="task-list-item"><input type="checkbox"> HOBBY-1 b</li></ul>',
			"</li></ul>",
		].join("");

		decorateTasksInReadingView(settingsWith(WORK, HOBBY), container);

		const parent = taskEl(0);
		const child = taskEl(1);

		expect(
			parent.querySelector(":scope > .timesheet-task-content")?.textContent
		).toBe(" WORK-1 a");
		expect(
			child.querySelector(":scope > .timesheet-task-content")?.textContent
		).toBe(" HOBBY-1 b");
		expect(
			parent.querySelector(":scope > .timesheet-task-affix-before")
				?.textContent
		).toBe("💼 ");
		expect(
			child.querySelector(":scope > .timesheet-task-affix-before")
				?.textContent
		).toBe("🎸 ");
	});

	it("leaves a list item without a checkbox alone", () => {
		container.innerHTML = "<ul><li>WORK-1 a</li></ul>";

		decorateTasksInReadingView(settingsWith(WORK), container);

		expect(container.querySelector(".timesheet-task-affix")).toBeNull();
	});

	it("leaves an empty record alone", () => {
		container.innerHTML =
			'<ul><li class="task-list-item"><input type="checkbox"></li></ul>';

		decorateTasksInReadingView(settingsWith(WORK), container);

		expect(taskEl().querySelector(".timesheet-task-content")).toBeNull();
	});
});
