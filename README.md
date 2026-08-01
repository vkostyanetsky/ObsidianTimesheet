# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

[README in Russian](README.ru.md)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in daily notes.

## 🙂 How does it work?

I assume you use daily notes to log the time you spend solving tasks, which are tracked in JIRA.

> [!note]
> You can track your tasks anywhere else; it doesn't really matter. I say JIRA since this software is pretty popular and, what's more important, its functionality, which I should mention, is not too different from similar ones in other trackers.

JIRA allows you to create different projects for issues; each project has its own unique prefix for issues belong to it. For instance, if the prefix is “FBI”, the project has issues like “FBI-1”, “FBI-2”, etc.

So, a part of your daily note may look like this:

```
- [ ] 10:00-12:00 Look around and find out what is wrong with the production server (FBI-1)
- [ ] 12:00-16:00 Estimate a feature development (FBI-2)
- [ ] 16:00-18:00 Fix a problem on the production server (FBI-1)
```

There are three tasks listed, two of which are related to the same JIRA issue. The plugin is able to group and round up the time you spent on JIRA issues to show you a convenient report. You can use it while attending the next daily meeting or to get a quick calculation of spent time to log it in JIRA.

Basically, the only thing you need is to add a sheet type in the plugin's settings and insert a `timesheet` code block anywhere in the daily note. In return you see something like this:

```
FBI-1 (4h)

- Look around and find out what is wrong with the production server
- Fix a problem on the production server

FBI-2 (4h)

- Estimate a feature development
```

You can see more examples in the [sample vault](sample).

## 🚀 Getting started

The plugin renders the code blocks described by its sheet types, and it ships with none of them, so the first thing to do after installing it is to add one:

1. Open **Settings → Timesheet** and press **Add sheet type**.
2. Leave **Code block type** empty. An empty code block type means the plain `timesheet` code block; fill the field in only when you need an additional kind of timesheet, like `timesheet-hobby`.
3. Fill in **Default task number pattern** — for example, `[A-Z]+-\d+`.

That's it: the `timesheet` code blocks of your vault are rendered from now on, and the **Insert timesheet** command appears in the command palette. Everything else — templates, the texts shown around task records — is optional and described below.

> [!tip]
> Along with `timesheet`, you get a `timesheet-query` code block reporting on a date range rather than on a single note. See [Can I build a report for several days at once?](#can-i-build-a-report-for-several-days-at-once) below.

> [!note]
> Updating from a version older than 1.6.0 requires nothing: the global task number patterns and templates of the previous versions are converted into a sheet type with an empty code block type on the first launch, so the code blocks you already have keep working.

## 🤔 Questions

### How the plugin finds issue numbers?

To be short, it is considering any sequence “X-Y” as a JIRA task number, if X is a set of capital letters and Y is a number. If you need more details or want to change this behavior, read the full answer below.

To be certain, the plugin uses patterns you can redefine. Basically, I'm speaking about regular expressions that the plugin applies to each task title to find a task number in it.

> [!note]
> I used to think that regular expressions mechanic was a way too complex tool for this plugin, but then I was like “oh, come on, who is going to use this, after all? let's be honest, a nerd like you and you both know how regexps looks like” :)

A good pattern to start with is `[A-Z]+-\d+` (`[A-Z]+` here is "one or more capital letters", while `\d+` means "any number"). It's enough to catch almost any JIRA issue number.

> [!tip]
> Though, it's probably a good idea to set specific patterns for your use case to avoid false positives. For the project I mentioned above as an example, it can be `FBI-\d+`.

There are two ways to define task number patterns. Firstly, you can enlist them right in a `timesheet` code block (one row, one template). Like this:

````
```timesheet
FBI-\d+
CLSFD-\d+
```
````

This will affect only this code block. 

You can also do it in the plugin's settings: take a look at the “Default task number pattern” setting of a sheet type. The format is the same: one template per row. The setting will impact all empty code blocks of this sheet type.

### How can I change how the report renders?

By default, the report uses [callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) to show you the report. You can change this via the plugin's settings; there are few templates intended to do it in the “Templates” section of every sheet type.

Basically, you can specify the template for header of the whole report, for a task, for a log line, and for the footer. Macros you can use in each one specified directly in the plugin's settings.

```
                    ← header (can be omitted)
FBI-100 (8h)        ← task
- Roam around       ← task log
- Find out          ← task log
                    ← footer (can be omitted)
```

> [!tip]
> We track issues in JIRA, so I added its URL as a prefix to my task template for Timesheet. Like this:
>
> ```
> >
> > https://my.jira.net/browse/{taskNumber} ({taskDuration})
> ```
> Voilà! Now Timesheet also shows me active links to JIRA instead of plain, boring issue numbers. 

### What if I log the same time twice?

Timesheet checks whether task records in a note cover the same part of a day. If they do, a warning is shown above the report:

```
- [ ] 20:00-21:00 Do thing 1 (FBI-1)
- [ ] 20:30-22:00 Do thing 2 (FBI-2)
```

> [!warning] Overlapping tasks
> - 20:00-21:00 Do thing 1 (FBI-1) ↔ 20:30-22:00 Do thing 2 (FBI-2)

Records are compared in pairs, so every conflict is listed with both of its records. Records of the same task are compared as well: `10:00-10:30` and `10:00-11:00` of the same issue overlap too, and the time is very likely counted twice.

Only records with a task number are checked, since they are the ones a report is built from. Records without a time interval are skipped, and records merely touching each other, like `10:00-11:00` and `11:00-12:00`, are not treated as overlapping. A record crossing midnight belongs to both days, so `23:00-02:00` is reported as overlapping `00:30-01:00`.

The warning is a separate callout above the report, so the output templates don't affect it.

If you don't need these warnings, turn off **Output → Warn about overlapping tasks** in the plugin settings. The setting is global: it applies to every kind of timesheet code block.

### How can I remove Markdown formatting from task text?

Enable **Output → Remove Markdown formatting** in the plugin settings. Timesheet will remove Markdown markup from task numbers and task log titles while preserving the Markdown defined by the output templates.

For example, `**standup**` becomes `standup`, `[JIRA](https://jira.example.com)` becomes `JIRA`, and `[[Note|caption]]` becomes `caption`. Inline code, italics, strikethrough, highlights, images, autolinks, and HTML tags are also converted to plain text where possible.

### Can I build a report for several days at once?

Yes. Besides the `timesheet` code block, which reports on the note it is written in, every sheet type renders a code block named after it with the `-query` suffix. Such a block reports on the daily notes of a date range:

````
```timesheet-query
period: 2026-07
```
````

The range is the only thing you set, since the rest is already known: a query code block belongs to a sheet type, so it uses its task number patterns and its templates. In other words, `timesheet-hobby-query` reports exactly what `timesheet-hobby` would, but for a bunch of days instead of one.

The block is written in YAML, the language note properties are written in, and it understands three settings.

**`period`** names a whole range at once:

| Value | Range |
| --- | --- |
| `2026` | The whole year |
| `2026-07` | The whole month |
| `2026-07-15` | A single day |
| `today`, `yesterday`, `tomorrow` | A single day |
| `-7d`, `+2w`, `-1m`, `-1y` | The single day a shift from today points at |
| `this-week`, `last-week` | The whole week |
| `this-month`, `last-month` | The whole month |
| `this-year`, `last-year` | The whole year |

A week starts on the day it starts on in your Obsidian language, so `this-week` means Monday to Sunday for some of us and Sunday to Saturday for the others.

**`from`** and **`to`** set the bounds of a range one by one:

````
```timesheet-query
from: 2026-07-01
to: 2026-07-31
```
````

Every bound accepts a date — `2026-07-01`, `2026-07`, or `2026` — as well as a shift from today: `today`, `yesterday`, `tomorrow`, or an offset like `-7d`, `+2w`, `-1m`, `-1y`. A date without a day is stretched towards the outside of the range, so `from: 2026-07` starts on the 1st of July while `to: 2026-07` ends on the 31st.

Naming a period and setting the bounds are two ways of saying the same thing, so `period` cannot be used together with `from` and `to`: a block trying to do both says so instead of guessing which of them you meant.

A bound you leave out makes the range open on that side, which is handy for a report on everything logged since a certain day:

````
```timesheet-query
from: -7d
```
````

Both bounds left out is not an error either: such a block shows an empty report with a hint above it, so an empty block tells you what to type into it. A mistake is reported the same way, in place of the report: a block naming a setting the plugin doesn't know, a period it cannot read, or a date that doesn't exist — like `2026-02-31` — says so instead of quietly reporting on the wrong days.

Daily notes are taken from the folder of the **Daily notes** core plugin — the **New file location** setting — and are recognized by its **Date format**, so the plugin reports on exactly the notes the core plugin creates. A format with subfolders in it, like `YYYY/MM/YYYY-MM-DD`, works as well; notes whose names are not dates are skipped.

> [!note]
> Task records are grouped by task number no matter which day they come from, so a report on a month looks exactly like a report on a day. Records repeating word for word are listed once, which is what makes a monthly report readable: a daily standup is a single line in it rather than twenty identical ones.

> [!note]
> Overlapping records are looked for in every note on its own: `10:00-11:00` of Monday and `10:00-11:00` of Tuesday are two different hours, not a mistake.

### Can I use several kinds of timesheets?

Yes. Take a look at the “Sheet types” section in the plugin's settings. A sheet type is a kind of timesheet code block with its own patterns and templates, and every timesheet code block — the plain `timesheet` one included — is rendered by a sheet type.

Press **Add sheet type** and fill in the **Code block type** field: an identifier without spaces, which is added to the `timesheet-` prefix. For instance, if you type `hobby`, the plugin starts rendering code blocks like this:

````
```timesheet-hobby
```

```timesheet-hobby-query
period: last-month
```
````

Every sheet type renders a pair of code blocks: the plain one, reporting on the note it is written in, and the `-query` one, reporting on the daily notes of a date range.

Leaving **Code block type** empty is not a mistake: such a sheet type renders the plain `timesheet` and `timesheet-query` code blocks. It has no privileges over the others — without it, these blocks are not rendered and there are no commands inserting them, just like for any other kind of timesheet.

Since the plugin adds the `timesheet-` prefix and the `-query` suffix itself, a code block type containing them is stripped rather than doubled: typing `timesheet-hobby-query` gives you the very same sheet type as typing `hobby`. The bare `query` is stripped as well, so it means an empty code block type: otherwise it would claim the `timesheet-query` block, which belongs to the sheet type of the plain `timesheet` one.

There can be only one type per code block name, so if you define two types with the same code block type, the first of them wins and the second one is ignored entirely.

Each sheet type has its own settings:

* **Title** — a human-friendly name of the sheet type. It is shown in brackets after the names of the commands inserting the code blocks of this type: for example, “Insert timesheet (Hobby)” and “Insert timesheet query (Hobby)”. If the title is empty, the code block names are used instead: “Insert timesheet-hobby” and “Insert timesheet-hobby-query”.
* **Default task number pattern** — patterns applied to task records of this sheet type. As usual, they can be specified either here or right in a code block of this type; a query code block, which is busy describing a date range, always uses the patterns from here.
* **Output → Text before task**, **Output → Text after task** — texts shown around task records belonging to this sheet type. See below.
* **Templates** — the set of templates the report is built from (Duration, Header, Task, Task log, Footer). These values are used only when a code block of this sheet type is rendered.

Time rounding (**Round up time**, **Time rounding interval**) and the global output settings (**Remove Markdown formatting**, **Warn about overlapping tasks**) are not a part of a sheet type: they apply to every sheet type at once.

> [!note]
> Obsidian registers code block handlers once, when the plugin is loaded. A newly added sheet type starts rendering right away, but a deleted one keeps being handled until Obsidian is restarted — such a block reports that its sheet type is not defined in the settings.

### Can I tell task records of different sheet types apart?

Yes. Fill in the **Output → Text before task** and **Output → Text after task** settings of a sheet type, and every task record in a note matching the task number patterns of this type gets these texts around it:

```
- [ ] 10:00-12:00 Fix a problem on the production server (FBI-1)
```

With `💼 ` set as the text before a task, the record is shown like this:

```
- [ ] 💼 10:00-12:00 Fix a problem on the production server (FBI-1)
```

The texts belong to the note view only. They are not saved to the note, they are not copied along with a task record, and reports don't know anything about them. They work both in the editor (Live Preview and Source mode) and in Reading view.

Leading and trailing spaces are kept, so you decide whether a text is separated from the record or glued to it. Both settings are empty by default, which means nothing is added.

Sheet types are checked in the order they are listed in the settings, and the first type whose patterns match a record wins — even when both of its texts are empty. In other words, a record never gets a text of a sheet type it doesn't belong to; reorder the types if a record is matched by more than one of them.

The sheet type of the plain `timesheet` code block takes part in this as well, since it is an ordinary sheet type. When settings of a version older than 1.6.0 are converted, it is added after the types you already had, so the texts you set up keep being shown for the same records as before.

### How are extra blank lines around the report content handled?

Timesheet removes extra line breaks generated at the boundary after the **Header** template and before the **Footer** template. Exactly one line break is kept between these sections and the generated task content. Line breaks inside Header, Task, Task log, and Footer templates are not changed.

## 🙏 Credits

Development of this plugin is assisted by the [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) by [gapmiss](https://github.com/gapmiss), used under the MIT License (see [NOTICE](.claude/skills/obsidian/NOTICE)).
