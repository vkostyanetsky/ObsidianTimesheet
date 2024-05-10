# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in daily notes.

## 🙂 How does it work?

I assume you use daily notes to log time you spent on doing some tasks you track in JIRA.

> [!note]
> You can track your tasks anywhere else, it's doesn't really matter. I call it JIRA since this software it pretty popular and, what's more important, its functionality, which I should mention, is not too different from similar functionality in other trackers.

JIRA allows you to create different projects for tasks; each project has its unique prefix for tasks belongs to it. For instance, if a project's prefix is "TASKS", it has tasks like "TASKS-1", "TASKS-2", etc. 

So, a part of your daily note may look like this:

```
- [ ] 10:00-12:00 Look around and find out what is wrong with the production server (TASKS-1)
- [ ] 12:00-16:00 Estimate a feature development (TASKS-2)
- [ ] 16:00-18:00 Fix a problem on the production server (TASKS-1)
```

There are three tasks listed, two of which have the same JIRA task number. This plugin is able to group and round time you spent on all the tasks and show you a convenient report. You can use it for the next daily meeting or to log time you spent to JIRA.

So, basically, you just insert a `timesheet` code block anywhere in the daily note and see something like this:

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

It uses templates you define. Templates are simple regular expressions which the plugin applies to each task title to find a task number in it.

> [!NOTE]
> I used to think that regular expressions mechanic is a way too complex tool for this task, but then I was like "oh, come on, who is going to use this, after all? let's be honest, a nerd like you and both of you know how regexps looks like" :)

There are two ways to set templates for task numbers. Firstly, you can enlist them right in a `timesheet` code block (one row — one template). Like this:

````
```timesheet
INTERNAL-\d*
EXTERNAL-\d*
```
````

This will affect only this specific code block in the specific note. 

> [!tip]
> `\d*` means "any number". When it comes to task numbers, it's rather only regular expression you actually need.

You also can keep code blocks empty and define task number templates in plugin' settings. The format is the same: one template per one row.