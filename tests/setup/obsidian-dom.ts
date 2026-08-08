/**
 * Adds the DOM helpers Obsidian puts into the global scope of a vault.
 *
 * They are not a part of the `obsidian` module — the app extends the browser
 * itself with them — so a stub of the module cannot bring them in. Only the
 * helpers the plugin uses are added, and they behave the way the ones of the
 * app do.
 */
interface DomElementInfo {
	cls?: string | string[];
	text?: string;
	attr?: Record<string, string | number | boolean | null>;
}

function applyInfo(el: HTMLElement, info?: DomElementInfo | string): void {
	if (info === undefined) {
		return;
	}

	if (typeof info === "string") {
		el.className = info;

		return;
	}

	if (info.cls !== undefined) {
		const classes = Array.isArray(info.cls) ? info.cls : info.cls.split(" ");

		classes
			.filter((cls) => cls !== "")
			.forEach((cls) => el.classList.add(cls));
	}

	if (info.text !== undefined) {
		el.textContent = info.text;
	}

	if (info.attr !== undefined) {
		Object.entries(info.attr).forEach(([name, value]) => {
			if (value === null) {
				return;
			}

			el.setAttribute(name, String(value));
		});
	}
}

function createEl<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	info?: DomElementInfo | string
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);

	applyInfo(el, info);

	return el;
}

const globals = globalThis as unknown as {
	createEl: typeof createEl;
	createDiv: (info?: DomElementInfo | string) => HTMLDivElement;
	createSpan: (info?: DomElementInfo | string) => HTMLSpanElement;
};

globals.createEl = createEl;
globals.createDiv = (info) => createEl("div", info);
globals.createSpan = (info) => createEl("span", info);

const elementPrototype = HTMLElement.prototype as unknown as {
	setText: (value: string) => void;
	empty: () => void;
	createEl: typeof createEl;
	createDiv: (info?: DomElementInfo | string) => HTMLDivElement;
	createSpan: (info?: DomElementInfo | string) => HTMLSpanElement;
};

elementPrototype.setText = function (this: HTMLElement, value: string): void {
	this.textContent = value;
};

elementPrototype.empty = function (this: HTMLElement): void {
	while (this.firstChild !== null) {
		this.removeChild(this.firstChild);
	}
};

elementPrototype.createEl = function <K extends keyof HTMLElementTagNameMap>(
	this: HTMLElement,
	tag: K,
	info?: DomElementInfo | string
): HTMLElementTagNameMap[K] {
	const el = createEl(tag, info);

	this.appendChild(el);

	return el;
};

elementPrototype.createDiv = function (
	this: HTMLElement,
	info?: DomElementInfo | string
): HTMLDivElement {
	return this.createEl("div", info);
};

elementPrototype.createSpan = function (
	this: HTMLElement,
	info?: DomElementInfo | string
): HTMLSpanElement {
	return this.createEl("span", info);
};
