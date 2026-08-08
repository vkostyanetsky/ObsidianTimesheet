import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
	{
		ignores: ["node_modules/**", "sample/**", "main.js", "*.mjs"],
	},
	js.configs.recommended,
	tseslint.configs["flat/eslint-recommended"],
	...tseslint.configs["flat/recommended"],
	{
		files: ["**/*.{js,jsx,ts,tsx,mts}"],
		languageOptions: {
			parser: tsparser,
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
		},
	},
];
