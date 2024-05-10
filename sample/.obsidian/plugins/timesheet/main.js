/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => Timesheet
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  defaultTaskNumberPatterns: "",
  roundUpTime: false,
  timeRoundingInterval: 15,
  templateHeader: "> [!summary] Timesheet ({tasksDuration})",
  templateTask: "> \n> {taskNumber} ({taskDuration})",
  templateTaskLog: "> - {taskLogTitlePrettified}",
  templateFooter: ""
};
var TimesheetSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Default task number patterns").setDesc(
      "You can specify task number patterns in a `timesheet` code block or simply set default ones here: it will affect all `timesheet` code blocks without patterns specified."
    ).setClass("text-snippets-class").addTextArea(
      (text) => text.setValue(this.plugin.settings.defaultTaskNumberPatterns).onChange(async (value) => {
        this.plugin.settings.defaultTaskNumberPatterns = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h2", { text: "Time rounding" });
    new import_obsidian.Setting(containerEl).setName("Round up time").setDesc(
      "Enables time rounding for tasks. For instance, 3h 42m can be shown as 4h."
    ).addToggle(
      (text) => text.setValue(this.plugin.settings.roundUpTime).onChange(async (value) => {
        this.plugin.settings.roundUpTime = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Time rounding interval").setDesc(
      "The interval to which time of a task will be rounded. For instance, if interval is 15m, then 2h 5m will be shown as 2h 30m."
    ).addDropdown(
      (text) => text.addOptions({
        "15": "15m",
        "30": "30m",
        "60": "1h"
      }).setValue(this.plugin.settings.timeRoundingInterval.toString()).onChange(async (value) => {
        this.plugin.settings.timeRoundingInterval = Number(value);
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h2", { text: "Templates" });
    new import_obsidian.Setting(containerEl).setName("Header").setDesc(
      "Macros: {tasksDuration} \u2014 total duration of all tasks in a note."
    ).setClass("text-snippets-class").addTextArea(
      (text) => text.setValue(this.plugin.settings.templateHeader).onChange(async (value) => {
        this.plugin.settings.templateHeader = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Task").setDesc(
      "Macros: {taskNumber} \u2014 number of a task, {taskDuration} \u2014 total duration of a task."
    ).setClass("text-snippets-class").addTextArea(
      (text) => text.setValue(this.plugin.settings.templateTask).onChange(async (value) => {
        this.plugin.settings.templateTask = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Task log").setDesc(
      "Macros: {taskLogTitlePrettified} \u2014 prettified task log title."
    ).setClass("text-snippets-class").addTextArea(
      (text) => text.setValue(this.plugin.settings.templateTaskLog).onChange(async (value) => {
        this.plugin.settings.templateTaskLog = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Footer").setDesc(
      "No macros."
    ).setClass("text-snippets-class").addTextArea(
      (text) => text.setValue(this.plugin.settings.templateFooter).onChange(async (value) => {
        this.plugin.settings.templateFooter = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/codeblocks/timesheet.ts
var import_obsidian3 = require("obsidian");

// src/parser.ts
var import_obsidian2 = require("obsidian");
var TimeLogsParser = class {
  static timeLogs(text, taskNumberPatterns) {
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
  static getTimeLog(startTime, endTime, title, taskNumberPatterns) {
    const startTimestamp = this.getTimestamp(startTime);
    const endTimestamp = this.getTimestamp(endTime);
    const result = {
      taskNumber: this.getTaskNumber(title, taskNumberPatterns),
      interval: [startTimestamp, endTimestamp].map((timestamp) => (0, import_obsidian2.moment)(new Date(timestamp)).format("HH:mm")).join("-"),
      duration: endTimestamp - startTimestamp,
      title: title.trim()
    };
    return result;
  }
  static getTaskNumber(title, taskNumberPatterns) {
    let taskNumber = "";
    taskNumberPatterns.every((taskNumberPattern) => {
      const match = new RegExp(taskNumberPattern, "gm").exec(title);
      if (match !== null) {
        taskNumber = match[0];
        return false;
      }
      return true;
    });
    return taskNumber;
  }
  static getTimestamp(time) {
    return Date.parse(`0001-01-01 ${time}`);
  }
};

// src/codeblocks/timesheet.ts
var TimesheetCodeBlock = class {
  static async render(plugin, src, body, ctx) {
    const noteFile = plugin.app.vault.getFileByPath(ctx.sourcePath);
    if (noteFile != null) {
      const taskNumberPatterns = this.getTaskNumberPatterns(src, plugin);
      const noteText = await plugin.app.vault.read(noteFile);
      const timeLogs = TimeLogsParser.timeLogs(noteText, taskNumberPatterns);
      const tasks = [];
      timeLogs.forEach((timeLog) => {
        let task = tasks.find((task2) => task2.number == timeLog.taskNumber);
        if (task !== void 0) {
          task.timeLogs.push(timeLog);
          task.duration += timeLog.duration;
        } else {
          task = {
            timeLogs: [timeLog],
            duration: timeLog.duration,
            number: timeLog.taskNumber
          };
          tasks.push(task);
        }
      });
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
        totalDurationPresentation = "0h 0m";
      }
      const lines = [];
      if (plugin.settings.templateHeader) {
        lines.push(plugin.settings.templateHeader.replace("{tasksDuration}", totalDurationPresentation));
      }
      tasks.forEach((task) => {
        if (plugin.settings.templateTask) {
          lines.push(
            plugin.settings.templateTask.replace("{taskNumber}", task.number).replace("{taskDuration}", this.getDurationPresentation(task.duration))
          );
        }
        if (plugin.settings.templateTaskLog) {
          const logs = [];
          task.timeLogs.forEach((log) => {
            let title = log.title.replace(task.number, "");
            title = title.replace(/\(\s*\)/g, "");
            if (logs.indexOf(title) == -1) {
              lines.push(plugin.settings.templateTaskLog.replace("{taskLogTitlePrettified}", title));
              logs.push(title);
            }
          });
        }
      });
      if (plugin.settings.templateFooter) {
        lines.push(plugin.settings.templateFooter);
      }
      import_obsidian3.MarkdownRenderer.render(plugin.app, lines.join("\n"), body, "", plugin);
    }
  }
  static hideTaskNumber(plugin, title, taskNumber) {
  }
  static roundTaskDuration(plugin, duration) {
    let result = duration;
    const interval = plugin.settings.timeRoundingInterval * 60 * 1e3;
    result = Math.ceil(result / interval) * interval;
    return result;
  }
  static getDurationPresentation(duration) {
    let minutes = duration / 1e3 / 60;
    const hours = Math.floor(minutes / 60);
    minutes -= hours * 60;
    const resultItems = [];
    if (hours > 0) {
      resultItems.push(`${hours}h`);
    }
    if (minutes > 0) {
      resultItems.push(`${minutes}m`);
    }
    return resultItems.join(" ");
  }
  static getTaskNumberPatterns(codeblockText, plugin) {
    let patternsString = codeblockText.trim();
    if (patternsString == "") {
      patternsString = plugin.settings.defaultTaskNumberPatterns;
    }
    return patternsString.split("\n").map((patternString) => patternString.trim());
  }
};

// src/main.ts
var Timesheet = class extends import_obsidian4.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingsTab();
    this.addInsertTimesheetCommand();
    this.addTimesheetCodeblock();
  }
  async addSettingsTab() {
    this.addSettingTab(new TimesheetSettingTab(this.app, this));
  }
  async addInsertTimesheetCommand() {
    this.addCommand({
      id: "insert-timesheet",
      name: "Insert timesheet",
      editorCallback: (editor, view) => {
        editor.replaceSelection(`\`\`\`timesheet

\`\`\``);
      }
    });
  }
  async addTimesheetCodeblock() {
    this.registerMarkdownCodeBlockProcessor(
      "timesheet",
      async (src, el, ctx) => {
        try {
          const root = el.createEl("div");
          const body = root.createEl("div");
          await TimesheetCodeBlock.render(this, src, body, ctx);
        } catch (error) {
          el.createEl("h3", {
            text: `Failed to show timesheet: ${error.message}`
          });
        }
      }
    );
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
