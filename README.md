# Obsidian Timesheet 🏢 📑 ⌛

[![ESLint](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml/badge.svg)](https://github.com/vkostyanetsky/ObsidianTimesheet/actions/workflows/eslint.yml)

It is a plugin for [Obsidian](https://obsidian.md) designed to generate timesheets for tasks in your daily notes.

## 🙂 How to use it?

Well, I assume you use daily notes to log time you spent on doing some tasks. For instance:

```
- [ ] 10:00-12:00 Find out what is wrong on the production server (TASK-1)
- [ ] 12:00-16:00 Estimate a feature development (TASK-2)
- [ ] 16:00-18:00 Make a fix for the production server (TASK-1)
```

There are three tasks listed, two of which have the same number.

Let's clarify what I mean when I say "task number". I just, basically, assume you use something like JIRA to track tasks. It allows you to create different projects; each project has its unique prefix for tasks inside.

For instance, if a project' prefix is "INTERNAL", it has tasks like INTERNAL-1, INTERNAL-2, etc., and the template for this project is `INTERNAL-\d*`, where `\d*` means "any number".

This plugin find task numbers, parse tasks in a note, groups and rounds time spent on all the tasks which belogs to each task number and show you a report. You can use it for the next daily meeting or to log spent time to JIRA.

Basically, you just insert a `timesheet` code block anywhere in this note and see something like this:

```
TASK-1 (4h)

- Find out what is wrong on the production server
- Make a fix for the production server

TASK-2 (4h)

- Estimate a feature development
```

You can see more examples in the sample vault.

## 🤔 Questions

### How this plugin finds task numbers?

It uses templates you define. Templates are simple regular expressions which the plugin applies to each task title to find a number in it.

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

You also can keep code blocks empty and define task number templates in plugin' settings. The format is the same: one template per one row.