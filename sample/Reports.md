A `timesheet-query` code block reports on the daily notes of a date range instead of the note it is written in. The range is the only thing to set: the patterns and the templates come from the sheet type, exactly as they do for a plain `timesheet` block.

## The whole month

```timesheet-query
period: 2024-04
```

## A couple of days

```timesheet-query
from: 2024-04-02
to: 2024-04-03
```

## The last week

```timesheet-query
from: -7d
to: today
```

## No range at all

```timesheet-query

```
