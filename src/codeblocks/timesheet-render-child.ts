import {
	MarkdownRenderChild,
	MarkdownRenderer,
	TFile,
} from "obsidian";

import Timesheet from "../main";
import TimesheetCodeBlock from "./timesheet";
import { getRenderSettings } from "../settings";

export default class TimesheetRenderChild extends MarkdownRenderChild {
	private updateTimer: number | null = null;
	private pendingNoteText: string | null = null;
	private rendering = false;
	private lastOutput: string | null = null;

	constructor(
		private readonly plugin: Timesheet,
		private readonly source: string,
		private readonly body: HTMLElement,
		private readonly file: TFile,
		private readonly sheetTypeCode: string
	) {
		super(body);
	}

	onload(): void {
		this.registerEvent(
			this.plugin.app.workspace.on(
				"quick-preview",
				(file, noteText) => {
					if (file.path !== this.file.path) {
						return;
					}

					this.scheduleUpdate(noteText);
				}
			)
		);
	}

	onunload(): void {
		if (this.updateTimer !== null) {
			window.clearTimeout(this.updateTimer);
		}

		this.pendingNoteText = null;
	}

	public async update(noteText: string): Promise<void> {
		this.pendingNoteText = noteText;

		if (this.rendering) {
			return;
		}

		this.rendering = true;

		try {
			while (this.pendingNoteText !== null) {
				const currentNoteText = this.pendingNoteText;
				this.pendingNoteText = null;

				const output = TimesheetCodeBlock.buildOutput(
					getRenderSettings(
						this.plugin.settings,
						this.sheetTypeCode
					),
					this.source,
					currentNoteText
				);

				if (output === this.lastOutput) {
					continue;
				}

				this.body.empty();

				await MarkdownRenderer.render(
					this.plugin.app,
					output,
					this.body,
					this.file.path,
					this
				);

				this.lastOutput = output;
			}
		} finally {
			this.rendering = false;
		}
	}

	private scheduleUpdate(noteText: string): void {
		if (this.updateTimer !== null) {
			window.clearTimeout(this.updateTimer);
		}

		this.updateTimer = window.setTimeout(() => {
			this.updateTimer = null;

			void this.update(noteText).catch((error: unknown) => {
				this.showError(error);
			});
		}, 250);
	}

	private showError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);

		this.body.empty();
		this.body.createEl("h3", {
			text: `Failed to show timesheet: ${message}`,
		});
	}
}
