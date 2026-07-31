# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.7.0 - 2026-07-30

### Added

* Every sheet type now renders a second code block, named after the first one with the `-query` suffix — `timesheet-query`, `timesheet-hobby-query`, and so on. Such a block reports on the daily notes of a date range instead of the note it is written in.
* A date range is described in the code block, which is written in YAML. The `period` setting names a whole range at once: `2026`, `2026-07`, `2026-07-15`, `today`, `yesterday`, `this-week`, `last-week`, `this-month`, `last-month`, `this-year`, `last-year`.
* The `from` and `to` settings set the bounds of a range one by one. Each of them accepts a date (`2026-07-01`, `2026-07`, `2026`) or a shift from today (`today`, `yesterday`, `tomorrow`, `-7d`, `+2w`, `-1m`, `-1y`). A date without a day is stretched towards the outside of the range, and a bound left out makes the range open on that side.
* Daily notes are taken from the folder of the **Daily notes** core plugin (**New file location**) and recognized by its **Date format**, a format with subfolders in it included.
* A query code block with no range shows an empty report with a hint above it, and a block the plugin cannot understand lists what exactly is wrong with its settings — an unknown setting, an unreadable period, or a date that doesn't exist, like `2026-02-31`.
* Added a command inserting a query code block for every sheet type: “Insert timesheet query (Hobby)”, or “Insert timesheet-hobby-query” when the sheet type has no title.
* A query report is rebuilt on its own whenever a daily note changes, since the notes it is built from are not the note it belongs to.

### Changed

* Task number patterns of a query code block always come from the **Default task number pattern** setting of its sheet type: the block itself is busy describing a date range.
* Overlapping task records are now looked for in every note on its own, so records of different days covering the same part of a day are not reported by a query code block.
* A code block type ending with `-query`, as well as the bare `query` one, is now treated the way a code block type starting with `timesheet-` is: the suffix is stripped, since the plugin adds it itself. In other words, `timesheet-hobby-query` typed into **Code block type** means the same sheet type as `hobby`, and `query` means an empty code block type. Dashes a code block type starts or ends with are dropped for the same reason.

### Fixed

* An empty line in the **Default task number pattern** setting, or in a code block listing patterns, no longer turns into a pattern matching everything, which made the plugin ignore the task records the patterns below it were meant for.
* A report failing to build is no longer able to stay on the screen: a report saying exactly what the previous one said used to be skipped, even when the previous one was an error message.

## 1.6.0 - 2026-07-30

### Changed

* The plain `timesheet` code block is now described by a sheet type as well: a sheet type with an empty **Code block type** renders `timesheet` blocks, while a filled-in one keeps rendering `timesheet-` blocks.
* Settings saved by an earlier version are converted on the first launch: the global patterns and templates become a sheet type with an empty code block type, and `timesheet` code blocks keep being rendered the way they were. The converted type is added after the existing sheet types, so the texts shown around task records are not affected. When a sheet type with an empty code block type is already there — an unfinished one, since such types used to be ignored — the converted values only fill in the properties it was left with.
* A fresh install no longer creates any sheet type, and a sheet type with an empty **Code block type** is treated exactly like the others: until it is added, `timesheet` code blocks are not rendered and the **Insert timesheet** command is not there.
* A sheet type shadowed by an earlier type with the same code block type is now fully ignored: it no longer shows its **Text before task** and **Text after task** around task records.
* **Time rounding → Round up time**, **Time rounding → Time rounding interval**, **Output → Remove Markdown formatting** and **Output → Warn about overlapping tasks** stay global: they apply to every sheet type.

### Removed

* Removed the global **Default task number patterns** setting and the global **Templates** section. Their values now belong to the sheet type of the `timesheet` code block, so every kind of timesheet is set up in one and the same place.

## 1.5.0 - 2026-07-30

### Added

* Added the **Output → Text before task** and **Output → Text after task** settings to every sheet type. When they are filled in, the texts are shown around task records in a note matching the task number patterns of the sheet type, both in the editor and in Reading view.
* The texts belong to the note view only: they are not saved to the note, are not copied with a task record, and are not used in reports.
* Both settings are empty by default, which means no texts are added. When a record matches the patterns of two or more sheet types, the texts of the first matching type are used — even when they are empty.

## 1.4.0 - 2026-07-30

### Added

* Added overlap detection for task records. When two records in a note cover the same part of a day — even when they belong to the same task — a warning callout listing the overlapping pairs is shown above the report.
* Added the **Output → Warn about overlapping tasks** setting to turn the warning on and off. Like the other output settings, it is global: it applies to every kind of timesheet code block. The warning is enabled by default.

## 1.3.1 - 2026-07-29

### Fixed

* Fixed the plugin failing to load when the settings contained a sheet type saved before the **Title** property was introduced. Properties missing from a saved sheet type are now filled in with their default values.

## 1.3.0 - 2026-07-29

### Added

* Added the **Sheet types** settings section. A sheet type defines its own code block name, so besides `timesheet` you can now use blocks like `timesheet-work` and `timesheet-hobby`.
* Each sheet type has its own **Title**, **Default task number pattern** setting, and its own set of **Templates** (Duration, Header, Task, Task log, Footer). Patterns and templates are used only when a code block of that type is rendered.
* Added a command inserting a code block for every sheet type. It is named after the sheet type title — for example, “Insert timesheet (Hobby)” — or after the code block name if the title is empty: “Insert timesheet-hobby”.

### Fixed

* Migrated the ESLint setup to the flat config format required by ESLint 9+ (`eslint.config.mjs` instead of `.eslintrc` and `.eslintignore`).
* Bumped TypeScript to 5.9 to resolve the peer dependency conflict with `@typescript-eslint` 8.

## 1.2.1 - 2026-07-29

### Fixed

* Project dependencies updated to the latest versions.

## 1.2.0 - 2026-07-25

### Fixed

* Fixed `timesheet` code blocks not updating when the current note was edited.
* Reports now refresh automatically after relevant changes without re-rendering the entire note.
* Added a short debounce and output comparison to avoid unnecessary recalculations and DOM updates.

## 1.1.5 - 2026-07-25

### Fixed

* Extra line breaks generated by the Task and Task log templates are now removed after the Header and before the Footer. Exactly one line break is kept at each boundary.

### Added

* Added the **Remove Markdown formatting** output setting. It converts Markdown in task numbers and task log titles to plain text while preserving formatting defined by output templates.

## 1.1.3 - 2025-07-27

### Changed

* The plugin now handles logs crossing midnight as overnight work. For example, “23:00–02:00” counts as 3 hours.

## 1.1.2 - 2025-04-21

### Fixed

* Fixed an issue that prevented using multiple `timesheet` code blocks with different patterns in the same note.

## 1.1.1 - 2024-06-09

### Fixed

* A bug due to which the description of two tasks with identical title, one of which has a time specified, and the other does not, was not shows as a single task log title.

## 1.1.0 - 2024-05-16

### Added

* Tasks are now sorted by time logged (from most to least).
* The duration presentation template (for header & task) can now be configured independently. This is a fix for cases when a header or task has a zero duration, so its presentation is "()". In such cases, it's better not to display duration at all.

### Changed

* Tasks without a time interval now also displayed in a `timesheet` code block.
* Macro "{taskLogTitlePrettified}" renamed to "{taskLogTitle}".

## 1.0.0 - 2024-05-10

### Added

* Calculation of the time a user spends working on issues.