# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.0 - 2024-05-16

### Added

* Tasks are now sorted by time logged (from most to least).
* The duration presentation template (for header & task) can now be configured independently. This is a fix for cases when a header or task has a zero duration, so its presentation is "()". In such cases, it's better not to display duration at all.

### Changed

* Tasks without a time interval now also included into timesheet.
* Macro "{taskLogTitlePrettified}" renamed to "{taskLogTitle}".

## 1.0.0 - 2024-05-10

### Added

* Calculation of the time a user spends working on issues.