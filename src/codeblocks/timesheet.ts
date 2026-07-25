import {
	MarkdownPostProcessorContext,
	MarkdownRenderer,
} from "obsidian";

import Timesheet from "../main";
import TimeLogsParser from "../parser";
import { Task } from "src/types";

export default class TimesheetCodeBlock {

	public static async render(
		plugin: Timesheet,
		src: string,
		body: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) {            
        const noteFile = plugin.app.vault.getFileByPath(ctx.sourcePath)
        
        if (noteFile != null) {
            const taskNumberPatterns = this.getTaskNumberPatterns(src, plugin);
            const noteText = await plugin.app.vault.read(noteFile);
            const timeLogs = TimeLogsParser.timeLogs(noteText, taskNumberPatterns);
            
            const tasks: Task[] = []
            timeLogs
                .filter(timeLog => timeLog.taskNumber !== '')
                .forEach((timeLog) => {                
                let task = tasks.find(task => task.number == timeLog.taskNumber)
                if (task !== undefined) {
                    task.timeLogs.push(timeLog)
                    task.duration += timeLog.duration
                } 
                else {
                    task = {
                        timeLogs: [timeLog],
                        duration: timeLog.duration,
                        number: timeLog.taskNumber
                    }
                    tasks.push(task)
                }
            })

            tasks.sort((a, b) => a.duration > b.duration ? -1 : 1);

            if (plugin.settings.roundUpTime) {
                tasks.forEach((task, taskIndex) => {  
                    tasks[taskIndex].duration = this.roundTaskDuration(plugin, task.duration);
                }); 
            }

            let totalDuration = 0;
            tasks.forEach(function(task) {
                totalDuration += task.duration;
            });

            const totalDurationPresentation = this.getDurationPresentation(plugin, totalDuration);
            const header = plugin.settings.templateHeader
                ? plugin.settings.templateHeader.replace("{tasksDuration}", totalDurationPresentation)
                : "";
            const contentLines: string[] = [];

            tasks.forEach((task) => {
                if (plugin.settings.templateTask) {
                    const taskNumber = plugin.settings.stripMarkdown
                        ? this.stripMarkdown(task.number)
                        : task.number;

                    contentLines.push(
                        plugin.settings.templateTask
                            .replace("{taskNumber}", taskNumber)
                            .replace("{taskDuration}", this.getDurationPresentation(plugin, task.duration))
                    );
                }

                if (plugin.settings.templateTaskLog) {
                    const logs: string[] = [];
                    task.timeLogs.forEach((log) => {
                        let title = log.title.replace(task.number, "");
                        title = title.replace(log.intervalString, "");
                        title = title.replace(/\(\s*\)/g, "").trim();

                        if (plugin.settings.stripMarkdown) {
                            title = this.stripMarkdown(title);
                        }

                        if (logs.indexOf(title) == -1) {
                            contentLines.push(
                                plugin.settings.templateTaskLog.replace("{taskLogTitle}", title)
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

            if (plugin.settings.templateFooter) {
                output = output
                    ? this.joinTemplateSections(output, plugin.settings.templateFooter)
                    : plugin.settings.templateFooter;
            }

            MarkdownRenderer.render(plugin.app, output, body, "", plugin);
        }
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
        result = result.replace(/\\([\\`*{}\[\]()#+\-.!_|>~])/g, "$1");

        return result.replace(/\s+/g, " ").trim();
    }

    private static roundTaskDuration(plugin: Timesheet, duration: number) {
        let result = duration;

        const interval = plugin.settings.timeRoundingInterval * 60 * 1000;
        result = Math.ceil(result / interval) * interval;

        return result;
    }

    private static getDurationPresentation(plugin: Timesheet, duration: number) {
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

        if (result && plugin.settings.templateDuration) {
            result = plugin.settings.templateDuration.replace("{duration}", result)
        }        

        return result;
    }

    private static getTaskNumberPatterns(codeblockText: string, plugin: Timesheet) {
        let patternsString = codeblockText.trim();
        if (patternsString == "") {
            patternsString = plugin.settings.defaultTaskNumberPatterns;
        }
        return patternsString.split("\n").map((patternString) => patternString.trim()) 
    }

}
