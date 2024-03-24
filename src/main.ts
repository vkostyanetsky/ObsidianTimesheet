import { 
    Plugin,
    Editor,
    MarkdownView,
} from 'obsidian';

import { 
    TimesheetSettingTab,
    TimesheetSettings,
    DEFAULT_SETTINGS
} from './settings';

import TimesheetCodeBlock from './codeblocks/timesheet';

export default class Timesheet extends Plugin {    
    settings: TimesheetSettings;

    async onload() {
        
        await this.loadSettings();

		this.addSettingTab(new TimesheetSettingTab(this.app, this));
    }

    onunload() {        
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
    
}