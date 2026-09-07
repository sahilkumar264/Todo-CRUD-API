# SQLite exploration

These queries were run against `tasks.db` during Week 3 Stage 4.

```sql
SELECT * FROM tasks;
SELECT * FROM tasks WHERE done = 1;
SELECT COUNT(*) FROM tasks;
UPDATE tasks SET done = 1;
DELETE FROM tasks WHERE done = 1;
```

`SELECT COUNT(*) FROM tasks;` returned `4` before the update and delete exercise. After running the update and delete queries, the API returned an empty task list because every completed task had been removed from the same SQLite database file.
