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

This plugin can parse this information, group and round time spent and show you a report you can use for the next daily meeting or to log spent time to JIRA.

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

It uses templates you define. There are two ways to do so.

> [!NOTE]  
> Let's clarify what I mean when I sey "templates". I basically assume you use something like JIRA to track tasks. It allows you to create different projects; each project has its unique prefix for tasks inside. For instance, if a project' prefix is "INTERNAL", it has tasks like INTERNAL-1, INTERNAL-2, etc.
> 
> So the template for this project is `INTERNAL-\d*`, where `\d*` means "any number".

Firstly, you can enlist templates for task numbers right in a `timesheet` code block. Like this:

````
```timesheet
INTERNAL-\d*
EXTERNAL-\d*
```
````

Each row is a regular expression that the plugin use to find a task number. 

> [!TIP]
> I previously thought about prefixes for this task which look a bit simplier, but then I was like "oh, come on, who is going to use this? nerds like you and you all know what a regexps looks like" :)

You also can keep code blocks empty and define task number templates in plugin' settings. The format is the same, one template per one row.