import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";

import { RangeSetBuilder } from "@codemirror/state";

import TimeLogsParser from "./parser";
import { getTaskNumberPatterns, TimesheetSettings } from "./settings";

const AFFIX_CLASS = "timesheet-task-affix";
const CONTENT_CLASS = "timesheet-task-content";

/** A task record: a list item with a checkbox, no matter whether it is done. */
const TASK_LINE_REGEXP = /^(\s*[-*+] \[.\]\s*)(.*)$/;

type TaskAffixSide = "before" | "after";

/** Texts shown around a task record. Neither of them is saved to the note. */
export interface TaskAffixes {
	before: string;
	after: string;
}

/**
 * Returns the texts to show around a task record.
 *
 * Sheet types are checked in the order they are defined in the settings, and
 * the first one whose task number patterns match the record wins — even when
 * both of its texts are empty. This way a record never gets a text of a sheet
 * type it doesn't belong to.
 */
export function getTaskAffixes(
	settings: TimesheetSettings,
	title: string
): TaskAffixes {
	for (const sheetType of settings.sheetTypes) {
		const patterns = getTaskNumberPatterns(
			sheetType.defaultTaskNumberPatterns
		);

		if (patterns.length === 0) {
			continue;
		}

		if (TimeLogsParser.getTaskNumber(title, patterns) === "") {
			continue;
		}

		return {
			before: sheetType.textBeforeTask ?? "",
			after: sheetType.textAfterTask ?? "",
		};
	}

	return { before: "", after: "" };
}

/**
 * A text shown before or after a task record.
 *
 * The widget is a decoration, so the text belongs to the view only: it is
 * neither stored in the note nor seen by anything reading the note text.
 */
class TaskAffixWidget extends WidgetType {
	constructor(
		private readonly text: string,
		private readonly side: TaskAffixSide
	) {
		super();
	}

	eq(other: TaskAffixWidget): boolean {
		return other.text === this.text && other.side === this.side;
	}

	toDOM(): HTMLElement {
		return createSpan({
			cls: `${AFFIX_CLASS} ${AFFIX_CLASS}-${this.side}`,
			text: this.text,
		});
	}

	ignoreEvent(): boolean {
		return false;
	}
}

/**
 * Shows the texts of sheet types around task records in the editor, both in
 * Live Preview and in Source mode. A new plugin instance is built every time
 * the settings change, so decorations are rebuilt from scratch as well.
 */
export function createTaskDecorationExtension(
	getSettings: () => TimesheetSettings
) {
	return ViewPlugin.fromClass(
		class implements PluginValue {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			private buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();
				const settings = getSettings();

				for (const { from, to } of view.visibleRanges) {
					let position = from;

					while (position <= to) {
						const line = view.state.doc.lineAt(position);
						const match = TASK_LINE_REGEXP.exec(line.text);

						position = line.to + 1;

						if (match === null || match[2].trim() === "") {
							continue;
						}

						const affixes = getTaskAffixes(settings, match[2]);

						if (affixes.before !== "") {
							builder.add(
								line.from + match[1].length,
								line.from + match[1].length,
								Decoration.widget({
									widget: new TaskAffixWidget(
										affixes.before,
										"before"
									),
									side: -1,
								})
							);
						}

						if (affixes.after !== "") {
							builder.add(
								line.to,
								line.to,
								Decoration.widget({
									widget: new TaskAffixWidget(
										affixes.after,
										"after"
									),
									side: 1,
								})
							);
						}
					}
				}

				return builder.finish();
			}
		},
		{
			decorations: (value) => value.decorations,
		}
	);
}

/**
 * Shows the texts of sheet types around task records in Reading view.
 *
 * The texts are added to the rendered note only, so they don't get into the
 * note itself, and copying a task record copies its own text.
 */
export function decorateTasksInReadingView(
	settings: TimesheetSettings,
	element: HTMLElement
): void {
	const items = element.querySelectorAll<HTMLElement>("li.task-list-item");

	items.forEach((item) => {
		const content = getTaskContentEl(item);

		if (content === null) {
			return;
		}

		const affixes = getTaskAffixes(settings, content.textContent ?? "");

		applyAffix(item, content, "before", affixes.before);
		applyAffix(item, content, "after", affixes.after);
	});
}

function applyAffix(
	item: HTMLElement,
	content: HTMLElement,
	side: TaskAffixSide,
	text: string
): void {
	const selector = `:scope > span.${AFFIX_CLASS}-${side}`;
	const existing = item.querySelector<HTMLElement>(selector);

	if (text === "") {
		existing?.remove();

		return;
	}

	const affix =
		existing ??
		createSpan({ cls: `${AFFIX_CLASS} ${AFFIX_CLASS}-${side}` });

	affix.setText(text);

	if (existing !== null) {
		return;
	}

	if (side === "before") {
		item.insertBefore(affix, content);
	} else {
		content.insertAdjacentElement("afterend", affix);
	}
}

/**
 * Returns the element wrapping the text of a task record, creating it when
 * the record is met for the first time.
 *
 * Nested lists are left out of the wrapper: a subtask is a task record on
 * its own, and it may belong to another sheet type.
 */
function getTaskContentEl(item: HTMLElement): HTMLElement | null {
	const existing = item.querySelector<HTMLElement>(
		`:scope > span.${CONTENT_CLASS}`
	);

	if (existing !== null) {
		return existing;
	}

	const nodes: ChildNode[] = [];

	item.childNodes.forEach((node) => {
		if (node instanceof HTMLInputElement) {
			return;
		}

		if (
			node instanceof HTMLElement &&
			(node.tagName === "UL" || node.tagName === "OL")
		) {
			return;
		}

		nodes.push(node);
	});

	if (nodes.length === 0) {
		return null;
	}

	const content = createSpan({ cls: CONTENT_CLASS });

	item.insertBefore(content, nodes[0]);
	nodes.forEach((node) => content.appendChild(node));

	return content;
}
