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
            timeLogs.forEach((timeLog) => {
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

            if (plugin.settings.roundUpTime) {
                tasks.forEach((task, taskIndex) => {  
                    tasks[taskIndex].duration = this.roundTaskDuration(plugin, task.duration);
                }); 
            }

            let totalDuration = 0;
            tasks.forEach(function(task) {
                totalDuration += task.duration;
            });

            let totalDurationPresentation = this.getDurationPresentation(totalDuration);
            if (totalDurationPresentation == "") {
                totalDurationPresentation = "0h 0m"
            }

            const lines: string[] = [`> [!summary] Timesheet (${totalDurationPresentation})`]
            tasks.forEach((task) => {
                lines.push(`> `)
                lines.push(`> JIRA:${task.number} (${this.getDurationPresentation(task.duration)})`)
                const titles: string[] = [];
                task.timeLogs.forEach((log) => {                    
                    let title = log.title.replace(task.number, "")
                    if (plugin.settings.hideEmptyBrackets) {
                        title = title.replace(/\(\s*\)/g, "")
                    }
                    if (titles.indexOf(title) == -1) {
                        lines.push(`> - ${title}`)
                        titles.push(title)
                    }
                })                
            })

            MarkdownRenderer.render(plugin.app, lines.join("\n"), body, "", plugin)
            }
	}


    private static hideTaskNumber(plugin: Timesheet, title: string, taskNumber: string) {

    }

    private static roundTaskDuration(plugin: Timesheet, duration: number) {
        let result = duration;

        const interval = plugin.settings.timeRoundingInterval * 60 * 1000;
        result = Math.ceil(result / interval) * interval;

        return result;
    }

    private static getDurationPresentation(duration: number) {
        let minutes = duration / 1000 / 60;
        const hours = Math.floor(minutes / 60);

        minutes -= hours * 60;

        const resultItems = [];

        if (hours > 0) {
            resultItems.push(`${hours}h`)
        }

        if (minutes > 0) {
            resultItems.push(`${minutes}m`)
        }

        return resultItems.join(" ")
    }

    private static getTaskNumberPatterns(codeblockText: string, plugin: Timesheet) {
        let patternsString = codeblockText.trim();
        if (patternsString == "") {
            patternsString = plugin.settings.defaultTaskNumberPatterns;
        }
        return patternsString.split("\n").map((patternString) => patternString.trim()) 
    }

}
