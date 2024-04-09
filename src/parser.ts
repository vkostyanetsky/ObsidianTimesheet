import {
    TimeLog,
} from './types'

import { moment } from "obsidian"

export default class TimeLogsParser {

	public static timeLogs(text: string, taskNumberPatterns: string[]) {
		const result = [];
		const regexp = /^- \[.\] \s*(\d{1,2}:\d{1,2})\s*-\s*(\d{1,2}:\d{1,2})(.*)$/gm;

		let match;

		while ((match = regexp.exec(text)) !== null) {            
			result.push(
                this.getTimeLog(
                    match[1],
                    match[2],
                    match[3],
                    taskNumberPatterns
                )
            );
		}

		return result;
	}

    private static getTimeLog(startTime: string, endTime: string, title: string, taskNumberPatterns: string[]) {
        const startTimestamp = this.getTimestamp(startTime);
        const endTimestamp = this.getTimestamp(endTime);

        const result: TimeLog = {
            taskNumber: this.getTaskNumber(title, taskNumberPatterns),
            interval: [startTimestamp, endTimestamp]
                .map((timestamp) => moment(new Date(timestamp)).format("HH:mm"))
                .join("-"),
            duration: endTimestamp - startTimestamp,
            title: title.trim(),            
        };

        return result;
    }

    private static getTaskNumber(title: string, taskNumberPatterns: string[]) {
        let taskNumber = ""

        taskNumberPatterns.every(taskNumberPattern => {
            const match = new RegExp(taskNumberPattern, "gm").exec(title);
            if (match !== null) {
                taskNumber = match[0];
                return false;
            }
            return true;
        });

        return taskNumber;
    }

	private static getTimestamp(time: string) {
		return Date.parse(`0001-01-01 ${time}`);
	}

}