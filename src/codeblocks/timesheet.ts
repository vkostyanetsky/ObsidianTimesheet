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
            const lines: string[] = []

            if (plugin.settings.templateHeader) {
                lines.push(plugin.settings.templateHeader.replace("{tasksDuration}", totalDurationPresentation))
            }

            tasks.forEach((task) => {
                if (plugin.settings.templateTask) {
                    lines.push(
                        plugin.settings.templateTask
                        .replace("{taskNumber}", task.number)
                        .replace("{taskDuration}", this.getDurationPresentation(plugin, task.duration))
                    );
                }

                if (plugin.settings.templateTaskLog) {
                    const logs: string[] = [];
                    task.timeLogs.forEach((log) => {                    
                        let title = log.title.replace(task.number, "");
                        title = title.replace(log.intervalString, "");
                        title = title.replace(/\(\s*\)/g, "").trim();

                        if (logs.indexOf(title) == -1) {
                            lines.push(plugin.settings.templateTaskLog.replace("{taskLogTitle}", title))
                            logs.push(title)
                        }
                    })                
                }
            })

            if (plugin.settings.templateFooter) {
                lines.push(plugin.settings.templateFooter)
            }

            MarkdownRenderer.render(plugin.app, lines.join("\n"), body, "", plugin)
        }
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
