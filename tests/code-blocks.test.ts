import { describe, expect, it } from "vitest";

import CodeBlocks from "../src/code-blocks";

describe("CodeBlocks.contentLines", () => {
	it("keeps the lines of a note with no code block in it", () => {
		expect(
			CodeBlocks.contentLines(["# A day", "", "- [x] a"].join("\n"))
		).toEqual(["# A day", "", "- [x] a"]);
	});

	it("drops the lines of a code block, its fences included", () => {
		expect(
			CodeBlocks.contentLines(
				[
					"above",
					"```",
					"inside",
					"```",
					"below",
				].join("\n")
			)
		).toEqual(["above", "below"]);
	});

	it("reads a block of tildes the way it reads a block of backticks", () => {
		expect(
			CodeBlocks.contentLines(["~~~yaml", "inside", "~~~", "below"].join("\n"))
		).toEqual(["below"]);
	});

	it("closes a block by a fence of its own kind only", () => {
		expect(
			CodeBlocks.contentLines(
				["```", "~~~", "inside", "~~~", "```", "below"].join("\n")
			)
		).toEqual(["below"]);
	});

	it("keeps a shorter fence inside a longer one", () => {
		expect(
			CodeBlocks.contentLines(
				["````md", "```", "inside", "```", "````", "below"].join("\n")
			)
		).toEqual(["below"]);
	});

	it("closes a block by a fence with nothing else on its line", () => {
		expect(
			CodeBlocks.contentLines(
				["```", "inside", "``` and a word", "still inside", "```", "below"].join("\n")
			)
		).toEqual(["below"]);
	});

	it("reads a block written with an indent", () => {
		expect(
			CodeBlocks.contentLines(
				["- a list item:", "  ```", "  inside", "  ```", "below"].join("\n")
			)
		).toEqual(["- a list item:", "below"]);
	});

	it("takes an inline code span for no fence", () => {
		expect(
			CodeBlocks.contentLines(
				["a ```span``` in a line", "below"].join("\n")
			)
		).toEqual(["a ```span``` in a line", "below"]);
	});

	it("stretches a block left unclosed till the end of a note", () => {
		expect(
			CodeBlocks.contentLines(["above", "```", "inside", "and more"].join("\n"))
		).toEqual(["above"]);
	});

	it("reads a note whose lines end with a carriage return", () => {
		expect(
			CodeBlocks.contentLines(
				["above", "```", "inside", "```", "below"].join("\r\n")
			)
		).toEqual(["above", "below"]);
	});
});

describe("CodeBlocks.covers", () => {
	it("tells the lines of a code block from the lines around it", () => {
		const codeBlocks = new CodeBlocks();

		expect(
			["above", "```", "inside", "```", "below"].map((line) =>
				codeBlocks.covers(line)
			)
		).toEqual([false, true, true, true, false]);
	});
});
