# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in daily notes.

[README in Russian](README.ru.md)

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

Basically, the only thing you need is to insert a `timesheet` code block anywhere in the daily note and see something like this:

```
FBI-1 (4h)

- Look around and find out what is wrong with the production server
- Fix a problem on the production server

FBI-2 (4h)

- Estimate a feature development
```

You can see more examples in the [sample vault](sample).

## 🤔 Questions

### How the plugin finds issue numbers?

To be short, it is considering any sequence “X-Y” as a JIRA task number, if X is a set of capital letters and Y is a number. If you need more details or want to change this behavior, read the full answer below.

To be certain, the plugin uses patterns you can redefine. Basically, I'm speaking about regular expressions that the plugin applies to each task title to find a task number in it.

> [!note]
> I used to think that regular expressions mechanic was a way too complex tool for this plugin, but then I was like “oh, come on, who is going to use this, after all? let's be honest, a nerd like you and you both know how regexps looks like” :)

By default, there is only one pattern which is set in the plugin's settings: `[A-Z]+-\d+` (`[A-Z]+` here is "one or more capital letters", while `\d+` means "any number"). It's enough to catch almost any JIRA issue number.

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

You can also do it globally via the plugin's settings: take a look at the “Default task number patterns” setting. The format is the same: one template per row. The setting will impact all empty `timesheet` code blocks.

### How can I change how the report renders?

By default, the report uses [callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) to show you the report. You can change this via the plugin's settings; there are few templates intended to do it in the “Templates” section.

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

### Can I use several kinds of timesheets?

Yes. Take a look at the “Sheet types” section in the plugin's settings. A sheet type is a separate kind of timesheet code block with its own patterns and templates.

Press **Add sheet type** and fill in the **Code block type** field: an identifier without spaces, which is added to the `timesheet-` prefix. For instance, if you type `hobby`, the plugin starts rendering code blocks like this:

````
```timesheet-hobby
```
````

A sheet type starts working as soon as **Code block type** is filled in; until then the type is ignored.

Each sheet type has its own settings:

* **Title** — a human-friendly name of the sheet type. It is shown in brackets after the name of the command inserting a code block of this type: for example, “Insert timesheet (Hobby)”. If the title is empty, the code block name is used instead: “Insert timesheet-hobby”.
* **Default task number pattern** — works exactly like the global setting, but applies to this sheet type only. As usual, patterns can be specified either here or right in a code block of this type.
* **Output → Text before task**, **Output → Text after task** — texts shown around task records belonging to this sheet type. See below.
* **Templates** — the same set of templates as in the global “Templates” section (Duration, Header, Task, Task log, Footer). These values are used only when a code block of this sheet type is rendered.

Time rounding and the global output settings (**Remove Markdown formatting**, **Warn about overlapping tasks**) remain global: they apply to every sheet type.

The plain `timesheet` code block keeps working and uses the global settings, so you can mix it with typed blocks in the same note.

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

Patterns of the plain `timesheet` code block (the global **Default task number patterns** setting) are not used here: these texts belong to a sheet type.

### How are extra blank lines around the report content handled?

Timesheet removes extra line breaks generated at the boundary after the **Header** template and before the **Footer** template. Exactly one line break is kept between these sections and the generated task content. Line breaks inside Header, Task, Task log, and Footer templates are not changed.
