# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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