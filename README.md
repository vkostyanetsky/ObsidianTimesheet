# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in daily notes.

## 🙂 How does it work?

I assume you use daily notes to log time you spent on doing some tasks which are being tracked in JIRA.

> [!note]
> You can track your tasks anywhere else, it's doesn't really matter. I call it JIRA since this software it pretty popular and, what's more important, its functionality, which I should mention, is not too different from similar one in other trackers.

JIRA allows you to create different projects for tasks; each project has its unique prefix for tasks belongs to it. For instance, if the prefix is "TASKS", the project has tasks like "TASKS-1", "TASKS-2", etc. 

So, a part of your daily note may look like this:

```
- [ ] 10:00-12:00 Look around and find out what is wrong with the production server (TASKS-1)
- [ ] 12:00-16:00 Estimate a feature development (TASKS-2)
- [ ] 16:00-18:00 Fix a problem on the production server (TASKS-1)
```

There are three tasks listed, two of which are related to the same JIRA task. This plugin is able to group and round time you spent on JIRA tasks and show you a convenient report. You can use it for the next daily meeting or to quick calculation of spent time to log it in JIRA.

Basically, you just need to insert a `timesheet` code block anywhere in the daily note and see something like this:

```
TASKS-1 (4h)

- Look around and find out what is wrong with the production server
- Fix a problem on the production server

TASKS-2 (4h)

- Estimate a feature development
```

You can see more examples in the [sample vault](sample).

## 🤔 Questions

### How the plugin finds task numbers?

The short answer: it is considering any sequence "X-Y" as a JIRA task number, if X is a set of capitals letters and Y is a number. If you need more details or want to change this behaviour, read the full answer below.

The full answer: it uses templates you can define. Templates are simple regular expressions which the plugin applies to each task title to find a task number in it.

> [!note]
> I used to think that regular expressions mechanic is a way too complex tool for this plugin, but then I was like "oh, come on, who is going to use this, after all? let's be honest, a nerd like you and you all know how regexps looks like" :)

By default, there is only one template: `[A-Z]+-\d+` (`[A-Z]` here is a one or more capital letters, while `\d+` means "any number"). It allows the plugin to catch almost any JIRA task number.

[!tip]
It's probably a good idea to set specific templates for your case to avoid false positives: for instance above, it is `TASKS-\d+`.

There are two ways to define task number templates. Firstly, you can enlist them right in a `timesheet` code block (one row — one template). Like this:

````
```timesheet
TASKS-\d+
CLSFD-\d+
```
````

This will affect only this code block. 

You also can do it globally and keep code blocks empty by defining task number templates in plugin's settings (have a look at "Default task number patterns" setting). 

The format is the same: one template per one row. The global setting will affect all `timesheet` code block, except ones where templates are set.

### How can I change how it renders?

By default the report uses a callout to show you information it can collect. You can change using plugin's settings; there are four template intended to this task in "Templates" section. 

Basically, you can specify the header, a task line, a log line, and the footer.

> [!tip]
> Personally, I use [JIRA Issue](https://github.com/marc0l92/obsidian-jira-issue) plugin to automatically render links to JIRA tasks in my notes. So, I changed my task like template looks like this:
>
> ```
> >
> JIRA:{taskNumber} ({taskDuration})
> ```
> Prefix "JIRA" here is also set as "Inline issue prefix" in JIRA issue settings, so Timesheet shows me working links to JIRA instead of dry tasks numbers.