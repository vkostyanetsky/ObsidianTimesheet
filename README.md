# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in daily notes.

## 🙂 How does it work?

I assume you use daily notes to log time you spent on solving tasks which are being tracker in JIRA.

> [!note]
> You can track your tasks anywhere else, it's doesn't really matter. I call it JIRA since this software it pretty popular and, what's more important, its functionality, which I should mention, is not too different from similar one in other trackers.

JIRA allows you to create different projects for issues; each project has its unique prefix for issues belong to it. For instance, if the prefix is "FBI", the project has issues like "FBI-1", "FBI-2", etc. 

So, a part of your daily note may look like this:

```
- [ ] 10:00-12:00 Look around and find out what is wrong with the production server (FBI-1)
- [ ] 12:00-16:00 Estimate a feature development (FBI-2)
- [ ] 16:00-18:00 Fix a problem on the production server (FBI-1)
```

There are three tasks listed, two of which are related to the same JIRA issue. The plugin is able to group and round time you spent on JIRA issues to show you a convenient report. You can use it while attending the next daily meeting or to get quick calculation of spent time to log it in JIRA.

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

To be short, it is considering any sequence "X-Y" as a JIRA task number, if X is a set of capital letters and Y is a number. If you need more details or want to change this behaviour, read the full answer below.

To be certain, the plugin uses patterns you can redefine. Basically, I'm speaking about regular expressions which the plugin applies to each task title to find a task number in it.

> [!note]
> I used to think that regular expressions mechanic is a way too complex tool for this plugin, but then I was like "oh, come on, who is going to use this, after all? let's be honest, a nerd like you and you both know how regexps looks like" :)

By default, there is only one pattern which is set in the plugin's settings: `[A-Z]+-\d+` (`[A-Z]+` here is "one or more capital letters", while `\d+` means "any number"). It's enough to catch almost any JIRA issue number.

> [!tip]
> Though, it's probably a good idea to set specific patterns for your use case to avoid false positives. For instance I mentioned above it can be `FBI-\d+`.

There are two ways to define task number patterns. Firstly, you can enlist them right in a `timesheet` code block (one row — one template). Like this:

````
```timesheet
FBI-\d+
CLSFD-\d+
```
````

This will affect only this code block. 

You also can do it globally via plugin's settings: have a look at "Default task number patterns". The format is the same: one template per one row. The setting will affect all empty `timesheet` code blocks.

### How can I change how the report renders?

By default the report uses a callout to show you the report. You can change this via plugin's settings; there are four template intended to do it in "Templates" section. 

Basically, you can specify the template for header of the whole report, for a task, for a log line, and for the footer. Macros you can use in each one specified directly in the plugin's settings.

```
                             ← header (can be omitted)
FBI-1 (4h)                   ← task
- Roam around and find out   ← task log
                             ← footer (can be omitted)
```

> [!tip]
> I use [JIRA Issue](https://github.com/marc0l92/obsidian-jira-issue). In its settings, I set "Inline issue prefix" to "JIRA:". It allows me to type "JIRA:FBI-1" and see an active link to JIRA issue FBI-1, including issue' title and actual status.
>
> Then I added the same prefix to my task template for Timesheet:
>
> ```
> >
> > JIRA:{taskNumber} ({taskDuration})
> ```
> Voila! Now Timesheet also shows me active links to JIRA instead of plain, boring tasks numbers. 