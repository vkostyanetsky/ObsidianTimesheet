import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolve = (path: string) =>
	fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			// The real module is provided by the app, so it cannot be imported
			// outside of a vault; see the stub for what stands in for it.
			{ find: /^obsidian$/, replacement: resolve("./tests/stubs/obsidian.ts") },
			// The plugin imports a couple of modules through the "baseUrl" of
			// the TypeScript configuration, which a bundler knows nothing of.
			{ find: /^src\//, replacement: resolve("./src/") },
		],
	},
	test: {
		// Obsidian renders a note in a browser, and so does a part of the
		// plugin: the reading view decorations are built out of DOM nodes.
		environment: "happy-dom",
		setupFiles: ["./tests/setup/obsidian-dom.ts"],
		include: ["tests/**/*.test.ts"],
	},
});
