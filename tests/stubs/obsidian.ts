/**
 * A stand-in for the `obsidian` module.
 *
 * The package the plugin is built against ships type definitions only: the
 * module itself is provided by the app at runtime, so an import of it cannot
 * be resolved outside of a vault. Tests are pointed at this file instead —
 * see the alias in `vitest.config.ts`.
 *
 * Only the parts the plugin actually uses are implemented, and the ones the
 * reports depend on are the very libraries the app bundles: a timesheet built
 * in a test is the timesheet a vault would show.
 */
import momentImpl from "moment";
import { load } from "js-yaml";

export const moment = momentImpl;

/** Obsidian parses the properties of a note and its code blocks with js-yaml. */
export function parseYaml(text: string): unknown {
	return load(text);
}

/**
 * Cleans up a path the way Obsidian does: slashes are unified and collapsed,
 * the ones surrounding the path are dropped, the spaces Obsidian refuses to
 * keep are replaced with plain ones, and the result is normalized to NFC.
 */
export function normalizePath(path: string): string {
	const normalized = path
		.replace(/([\\/])+/g, "/")
		.replace(/(^\/+|\/+$)/g, "")
		.replace(/\u00A0|\u202F/g, " ")
		.normalize("NFC");

	return normalized === "" ? "/" : normalized;
}

export class TAbstractFile {
	path = "";
	name = "";
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "md";
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
}

/**
 * The settings tab of the plugin is drawn by Obsidian itself, so the classes
 * it is built from are stubs: the module defining the tab is imported for the
 * pure functions next to it, and nothing in the tests draws a setting.
 */
export class App {}

export class Component {}

export class PluginSettingTab {
	containerEl!: HTMLElement;

	constructor(
		public app: App,
		public plugin: unknown
	) {}

	display(): void {}
}

export class Setting {
	constructor(public containerEl: HTMLElement) {}
}

export class ButtonComponent {
	constructor(public containerEl: HTMLElement) {}
}
