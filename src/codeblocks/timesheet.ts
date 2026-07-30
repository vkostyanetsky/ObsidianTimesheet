import TimeLogsParser from "../parser";
import TimeLogsOverlaps from "../overlaps";
import { TimesheetRenderSettings } from "../settings";
import { Task, TimeLog } from "src/types";

const OVERLAPS_WARNING_TITLE = "Overlapping tasks";
const OVERLAPS_SEPARATOR = "↔";

export default class TimesheetCodeBlock {
	public static buildOutput(
		settings: TimesheetRenderSettings,
		src: string,
		noteText: string
	): string {
		const taskNumberPatterns = this.getTaskNumberPatterns(src, settings);
		const timeLogs = TimeLogsParser.timeLogs(
			noteText,
			taskNumberPatterns
		).filter((timeLog) => timeLog.taskNumber !== "");

		const tasks: Task[] = [];
		timeLogs.forEach((timeLog) => {
			let task = tasks.find(task => task.number == timeLog.taskNumber);
			if (task !== undefined) {
				task.timeLogs.push(timeLog);
				task.duration += timeLog.duration;
			}
			else {
				task = {
					timeLogs: [timeLog],
					duration: timeLog.duration,
					number: timeLog.taskNumber
				};
				tasks.push(task);
			}
		});

		tasks.sort((a, b) => a.duration > b.duration ? -1 : 1);

		if (settings.roundUpTime) {
			tasks.forEach((task, taskIndex) => {
				tasks[taskIndex].duration = this.roundTaskDuration(settings, task.duration);
			});
		}

		let totalDuration = 0;
		tasks.forEach(function(task) {
			totalDuration += task.duration;
		});

		const totalDurationPresentation = this.getDurationPresentation(settings, totalDuration);
		const header = settings.templateHeader
			? settings.templateHeader.replace("{tasksDuration}", totalDurationPresentation)
			: "";
		const contentLines: string[] = [];

		tasks.forEach((task) => {
			if (settings.templateTask) {
				const taskNumber = settings.stripMarkdown
					? this.stripMarkdown(task.number)
					: task.number;

				contentLines.push(
					settings.templateTask
						.replace("{taskNumber}", taskNumber)
						.replace("{taskDuration}", this.getDurationPresentation(settings, task.duration))
				);
			}

			if (settings.templateTaskLog) {
				const logs: string[] = [];
				task.timeLogs.forEach((log) => {
					let title = log.title.replace(task.number, "");
					title = title.replace(log.intervalString, "");
					title = title.replace(/\(\s*\)/g, "").trim();

					if (settings.stripMarkdown) {
						title = this.stripMarkdown(title);
					}

					if (logs.indexOf(title) == -1) {
						contentLines.push(
							settings.templateTaskLog.replace("{taskLogTitle}", title)
						);
						logs.push(title);
					}
				});
			}
		});

		const content = contentLines.join("\n");
		let output = header;

		if (content) {
			output = output ? this.joinTemplateSections(output, content) : content;
		}

		if (settings.templateFooter) {
			output = output
				? this.joinTemplateSections(output, settings.templateFooter)
				: settings.templateFooter;
		}

		const warning = this.buildOverlapsWarning(settings, timeLogs);

		if (warning) {
			output = output ? `${warning}\n\n${output}` : warning;
		}

		return output;
	}

	/**
	 * Returns a callout listing pairs of task records which share the same
	 * part of a day, or an empty string when there are no such pairs or the
	 * warning is turned off in the plugin settings.
	 *
	 * The callout is a separate block, so it is not affected by the output
	 * templates: it must be noticeable no matter how a report is customized.
	 */
	private static buildOverlapsWarning(
		settings: TimesheetRenderSettings,
		timeLogs: TimeLog[]
	): string {
		if (!settings.warnAboutOverlaps) {
			return "";
		}

		const overlaps = TimeLogsOverlaps.find(timeLogs);

		if (overlaps.length === 0) {
			return "";
		}

		const lines = [`> [!warning] ${OVERLAPS_WARNING_TITLE}`];

		overlaps.forEach((overlap) => {
			const first = this.getOverlapTitle(settings, overlap.first);
			const second = this.getOverlapTitle(settings, overlap.second);

			lines.push(`> - ${first} ${OVERLAPS_SEPARATOR} ${second}`);
		});

		return lines.join("\n");
	}

	private static getOverlapTitle(
		settings: TimesheetRenderSettings,
		timeLog: TimeLog
	): string {
		return settings.stripMarkdown
			? this.stripMarkdown(timeLog.title)
			: timeLog.title;
	}

	private static joinTemplateSections(left: string, right: string) {
		const normalizedLeft = left.replace(/(?:\r?\n[ \t]*)+$/, "");
		const normalizedRight = right.replace(/^(?:[ \t]*\r?\n)+/, "");

		if (!normalizedLeft) {
			return normalizedRight;
		}

		if (!normalizedRight) {
			return normalizedLeft;
		}

		return `${normalizedLeft}\n${normalizedRight}`;
	}

	private static stripMarkdown(text: string) {
		let result = text;

		result = result.replace(/!\[\[([^\]]+)\]\]/g, (_match, target: string) => {
			const separatorIndex = target.lastIndexOf("|");
			return separatorIndex >= 0 ? target.slice(separatorIndex + 1) : target;
		});

		result = result.replace(/\[\[([^\]]+)\]\]/g, (_match, target: string) => {
			const separatorIndex = target.lastIndexOf("|");
			return separatorIndex >= 0 ? target.slice(separatorIndex + 1) : target;
		});

		result = result.replace(/!\[([^\]]*)\]\((?:\\.|[^)])*\)/g, "$1");
		result = result.replace(/\[([^\]]+)\]\((?:\\.|[^)])*\)/g, "$1");
		result = result.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");
		result = result.replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gi, "$1");
		result = result.replace(/<\/?[A-Za-z][^>]*>/g, "");
		result = result.replace(/(`{1,3})(.*?)\1/g, "$2");
		result = result.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2");
		result = result.replace(/(~~|==)(?=\S)([\s\S]*?\S)\1/g, "$2");
		result = result.replace(/\*(?=\S)([\s\S]*?\S)\*/g, "$1");
		result = result.replace(/(?<!\w)_(?=\S)([\s\S]*?\S)_(?!\w)/g, "$1");
		result = result.replace(/\\([\\`*{}[\]()#+\-.!_|>~])/g, "$1");

		return result.replace(/\s+/g, " ").trim();
	}

	private static roundTaskDuration(settings: TimesheetRenderSettings, duration: number) {
		let result = duration;

		const interval = settings.timeRoundingInterval * 60 * 1000;
		result = Math.ceil(result / interval) * interval;

		return result;
	}

	private static getDurationPresentation(settings: TimesheetRenderSettings, duration: number) {
		let minutes = duration / 1000 / 60;
		const hours = Math.floor(minutes / 60);

		minutes -= hours * 60;

		const resultItems = [];

		if (hours > 0) {
			resultItems.push(`${hours}h`);
		}

		if (minutes > 0) {
			resultItems.push(`${minutes}m`);
		}

		let result = resultItems.join(" ");

		if (result && settings.templateDuration) {
			result = settings.templateDuration.replace("{duration}", result);
		}

		return result;
	}

	private static getTaskNumberPatterns(codeblockText: string, settings: TimesheetRenderSettings) {
		let patternsString = codeblockText.trim();
		if (patternsString == "") {
			patternsString = settings.defaultTaskNumberPatterns;
		}
		return patternsString.split("\n").map((patternString) => patternString.trim());
	}
}
