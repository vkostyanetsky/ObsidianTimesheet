import { moment } from "obsidian"

export default class TimeLogsParser {

	public static timeLogs(text: string, taskNumberPatterns: string[]) {
		const result = [];
        const regexp = /^- \[.\] \s*(.*)$/gm;

		let match;

		while ((match = regexp.exec(text)) !== null) {
            const timeLog = this.getTimeLog(match[1], taskNumberPatterns);

            if (timeLog !== undefined) {
                result.push(timeLog);
            }			
		}

		return result;
	}

    private static getPeriod(title: string) {
        const regexp = /^((\d{1,2}:\d{1,2})\s*-\s*(\d{1,2}:\d{1,2})).*$/gm;

		let match;

        const result = {
            "startTime": "00:00",
            "endTime": "00:00",
            "string": "",
        }
        
		if ((match = regexp.exec(title.trim())) !== null) {
            result.startTime = match[2];
            result.endTime = match[3];
            result.string = match[1];
        }

        return result;
    }

    private static getTimeLog(title: string, taskNumberPatterns: string[]) {

        const period = this.getPeriod(title)

        let startTimestamp = 0;
        let endTimestamp = 0;
        let duration = 0;

        if (period.string) {
            startTimestamp = this.getTimestamp(period.startTime);
            endTimestamp = this.getTimestamp(period.endTime);
            duration = endTimestamp - startTimestamp;
        }

        const taskNumber = this.getTaskNumber(title, taskNumberPatterns)

        let result = undefined;

        if (duration > 0 || taskNumber != "") {
            result = {
                taskNumber: taskNumber,
                interval: [startTimestamp, endTimestamp]
                    .map((timestamp) => timestamp == 0 ? "00:00" : moment(new Date(timestamp)).format("HH:mm"))
                    .join("-"),
                intervalString: period.string,
                duration: duration,
                title: title.trim(),            
            };            
        }

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