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

        const period = this.getPeriod(title);

        const start = moment(period.startTime, "HH:mm");
        let end = moment(period.endTime,   "HH:mm");

        if (end.isBefore(start)) {
            end = end.add(1, "day");
        }

        const durationMs = end.diff(start);

        const taskNumber = this.getTaskNumber(title, taskNumberPatterns);

        if (durationMs > 0 || taskNumber !== "") {
            const startTime = start.hours() * 60 + start.minutes();

            return {
                taskNumber,
                interval: `${start.format("HH:mm")}-${end.format("HH:mm")}`,
                intervalString: period.string,
                duration: durationMs,
                startTime,
                endTime: startTime + durationMs / 1000 / 60,
                title: title.trim(),
            };
        }

        return undefined;
    }

    public static getTaskNumber(title: string, taskNumberPatterns: string[]) {
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

}