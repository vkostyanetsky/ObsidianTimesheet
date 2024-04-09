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
		const noteFile = plugin.app.workspace.getActiveFile();

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

            const lines: string[] = ["> [!summary] Timesheet"]
            tasks.forEach((task) => {
                lines.push(`>- ${task.number} (${task.duration / 1000 / 60}m)`)
                task.timeLogs.forEach((log) => {
                    lines.push(`>    - ${log.title}`)
                })                
            })

            MarkdownRenderer.render(plugin.app, lines.join("\n"), body, "", plugin)
		}
	}

    private static getTaskNumberPatterns(codeblockText: string, plugin: Timesheet) {
        let patternsString = codeblockText.trim();
        if (patternsString == "") {
            patternsString = plugin.settings.defaultTaskNumberPatterns;
        }
        return patternsString.split("\n").map((patternString) => patternString.trim()) 
    }

}
