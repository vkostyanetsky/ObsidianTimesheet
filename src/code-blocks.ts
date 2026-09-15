/** A line which may open or close a fenced code block. */
const CODE_FENCE_REGEXP = /^\s*(`{3,}|~{3,})(.*)$/;

/**
 * Tells which lines of a note belong to a fenced code block.
 *
 * Such a block is a sample of a text rather than a part of the note, so the
 * task records it shows are not records of a day: neither a report nor the
 * decorations of the editor must take them for real ones.
 *
 * The lines are read one by one, starting from the very first line of the
 * note: a fence is known by the lines above it, and nothing else tells a
 * block from a plain list of records.
 */
export default class CodeBlocks {
	/** The marker of the code block being read, if there is one. */
	private fence = "";

	/**
	 * Tells whether the next line of a note belongs to a code block, the
	 * lines of its fences included. A block left unclosed lasts till the end
	 * of the note, the way Markdown sees it.
	 */
	public covers(line: string): boolean {
		const match = CODE_FENCE_REGEXP.exec(line);

		if (this.fence === "") {
			if (match !== null && this.isOpening(match[1], match[2])) {
				this.fence = match[1];

				return true;
			}

			return false;
		}

		if (match !== null && this.isClosing(match[1], match[2])) {
			this.fence = "";
		}

		return true;
	}

	/**
	 * A marker opens a code block unless it is made of backticks and has one
	 * of them in its info string: an inline code span may look like a fence,
	 * and taking it for one would hide the rest of a note.
	 */
	private isOpening(marker: string, infoString: string): boolean {
		return marker.startsWith("~") || !infoString.includes("`");
	}

	/**
	 * A code block is closed by a marker of the same kind, at least as long
	 * as the one it has been opened with, and with nothing else on its line.
	 */
	private isClosing(marker: string, rest: string): boolean {
		return marker.startsWith(this.fence[0])
			&& marker.length >= this.fence.length
			&& rest.trim() === "";
	}

	/** Returns the lines of a note which do not belong to a code block. */
	public static contentLines(text: string): string[] {
		const codeBlocks = new CodeBlocks();

		return text.split(/\r?\n/).filter(line => !codeBlocks.covers(line));
	}
}
